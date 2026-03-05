package main

import (
	"fmt"
	"net"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"syscall"
	"time"
)

const (
	Version     = "1.0.3"
	AppURL      = "http://127.0.0.1:3000"
	AppPort     = "3000"
	PgPort      = "5432"
	MeiliPort   = "7700"
	ArchiveHome = "D:\\ArchiveManagement"
)

var (
	kernel32                    = syscall.NewLazyDLL("kernel32.dll")
	procSetConsoleTextAttribute = kernel32.NewProc("SetConsoleTextAttribute")
	procGetStdHandle            = kernel32.NewProc("GetStdHandle")
	procSetConsoleOutputCP      = kernel32.NewProc("SetConsoleOutputCP")
)

const (
	STD_OUTPUT_HANDLE = ^uint32(0) - 11
	COLOR_GREEN       = 0x0A
	COLOR_RED         = 0x0C
	COLOR_YELLOW      = 0x0E
	COLOR_CYAN        = 0x0B
	COLOR_GRAY        = 0x07
)

var stdoutHandle uintptr

// Track if any service failed to start
var hasFailure = false

func init() {
	handle, _, _ := procGetStdHandle.Call(uintptr(STD_OUTPUT_HANDLE))
	stdoutHandle = handle
	procSetConsoleOutputCP.Call(uintptr(65001))
}

func setColor(color uint16) {
	procSetConsoleTextAttribute.Call(stdoutHandle, uintptr(color))
}

func resetColor() {
	procSetConsoleTextAttribute.Call(stdoutHandle, uintptr(COLOR_GRAY))
}

func main() {
	printHeader()

	// Step 1: Check Node.js
	if !checkNodeJS() {
		hasFailure = true
		printError("Node.js 未安装，请先安装 Node.js")
		waitForUser()
		return
	}

	// Step 2: Check and start PostgreSQL
	checkAndStartPostgreSQL()

	// Step 3: Check and start Meilisearch
	checkAndStartMeilisearch()

	// Step 4: Check and start App
	checkAndStartApp()

	// Wait for app to be ready
	fmt.Println()
	fmt.Println("等待服务就绪...")
	if waitForPort(AppPort, 30*time.Second) {
		fmt.Println("服务已就绪，正在打开浏览器...")
		openBrowser()

		if hasFailure {
			// Some service failed but app is accessible
			fmt.Println()
			setColor(COLOR_YELLOW)
			fmt.Println("部分服务启动异常，但系统可访问")
			resetColor()
			waitForUser()
		} else {
			// All good, auto close with countdown
			countdownExit(10)
		}
	} else {
		hasFailure = true
		printError("服务启动超时，请手动访问 " + AppURL)
		waitForUser()
	}
}

func printHeader() {
	setColor(COLOR_CYAN)
	fmt.Println("========================================")
	fmt.Println("    档案管理系统启动器 v" + Version)
	fmt.Println("========================================")
	resetColor()
	fmt.Println()
}

func printError(msg string) {
	setColor(COLOR_RED)
	fmt.Print("[ERROR] ")
	resetColor()
	fmt.Println(msg)
}

func printStep(step, total int, name string) {
	fmt.Printf("[%d/%d] %s...", step, total, name)
}

// ==================== Node.js ====================

func checkNodeJS() bool {
	printStep(1, 4, "Node.js")

	cmd := exec.Command("node", "--version")
	output, err := cmd.CombinedOutput()
	if err != nil {
		setColor(COLOR_RED)
		fmt.Println(" 未安装")
		resetColor()
		return false
	}

	version := strings.TrimSpace(string(output))
	setColor(COLOR_GREEN)
	fmt.Printf(" [OK] %s\n", version)
	resetColor()
	return true
}

// ==================== PostgreSQL ====================

func checkAndStartPostgreSQL() {
	printStep(2, 4, "PostgreSQL")

	running := isPostgreSQLRunning()
	portOK := isPortListening(PgPort)

	if running && portOK {
		setColor(COLOR_GREEN)
		fmt.Println(" [OK] 已运行")
		resetColor()
		return
	}

	setColor(COLOR_YELLOW)
	if !running {
		fmt.Print(" 未运行 -> 启动中...")
	} else {
		fmt.Print(" 服务异常 -> 修复中...")
	}
	resetColor()

	startPostgreSQL()
	time.Sleep(3 * time.Second)

	running = isPostgreSQLRunning()
	portOK = isPortListening(PgPort)

	if running && portOK {
		setColor(COLOR_GREEN)
		fmt.Println(" [OK]")
		resetColor()
	} else {
		hasFailure = true
		setColor(COLOR_RED)
		fmt.Println(" [FAIL] 启动失败")
		resetColor()
	}
}

func isPostgreSQLRunning() bool {
	cmd := exec.Command("powershell", "-Command",
		"(Get-Service -Name 'PostgreSQL' -ErrorAction SilentlyContinue).Status")
	output, err := cmd.CombinedOutput()
	if err != nil {
		return false
	}
	return strings.TrimSpace(string(output)) == "Running"
}

func startPostgreSQL() {
	cmd := exec.Command("powershell", "-Command",
		"Start-Service -Name 'PostgreSQL' -ErrorAction SilentlyContinue")
	cmd.Run()
}

// ==================== Meilisearch ====================

func checkAndStartMeilisearch() {
	printStep(3, 4, "Meilisearch")

	if isPortListening(MeiliPort) {
		setColor(COLOR_GREEN)
		fmt.Println(" [OK] 已运行")
		resetColor()
		return
	}

	setColor(COLOR_YELLOW)
	fmt.Print(" 未运行 -> 启动中...")
	resetColor()

	toolkitPath := ArchiveHome + "\\scripts\\toolkit.ps1"
	if _, err := os.Stat(toolkitPath); err == nil {
		cmd := exec.Command("powershell", "-ExecutionPolicy", "Bypass", "-File", toolkitPath, "start", "ms")
		cmd.Run()
	} else {
		startMeilisearchDirect()
	}

	time.Sleep(3 * time.Second)

	if isPortListening(MeiliPort) {
		setColor(COLOR_GREEN)
		fmt.Println(" [OK]")
		resetColor()
	} else {
		hasFailure = true
		setColor(COLOR_RED)
		fmt.Println(" [FAIL] 启动失败")
		resetColor()
	}
}

func startMeilisearchDirect() {
	meiliPath := "C:\\Program Files\\Meilisearch\\meilisearch.exe"
	if _, err := os.Stat(meiliPath); os.IsNotExist(err) {
		return
	}

	masterKey := readMeiliMasterKey()
	args := []string{
		"--master-key=" + masterKey,
		"--db-path=" + ArchiveHome + "\\data\\meilisearch",
		"--http-addr=127.0.0.1:7700",
	}

	cmd := exec.Command(meiliPath, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow:    true,
		CreationFlags: syscall.CREATE_NEW_PROCESS_GROUP,
	}
	cmd.Start()
}

func readMeiliMasterKey() string {
	envPath := ArchiveHome + "\\config\\.env"
	data, err := os.ReadFile(envPath)
	if err != nil {
		return ""
	}
	re := regexp.MustCompile(`MEILI_MASTER_KEY\s*=\s*(.+)`)
	matches := re.FindStringSubmatch(string(data))
	if len(matches) > 1 {
		return strings.TrimSpace(matches[1])
	}
	return ""
}

// ==================== App ====================

func checkAndStartApp() {
	printStep(4, 4, "应用服务")

	if isPortListening(AppPort) {
		setColor(COLOR_GREEN)
		fmt.Println(" [OK] 已运行")
		resetColor()
		return
	}

	setColor(COLOR_YELLOW)
	fmt.Print(" 未运行 -> 启动中...")
	resetColor()

	toolkitPath := ArchiveHome + "\\scripts\\toolkit.ps1"
	if _, err := os.Stat(toolkitPath); err == nil {
		cmd := exec.Command("powershell", "-ExecutionPolicy", "Bypass", "-File", toolkitPath, "start", "app")
		cmd.Run()
	} else {
		startAppDirect()
	}

	time.Sleep(5 * time.Second)

	if isPortListening(AppPort) {
		setColor(COLOR_GREEN)
		fmt.Println(" [OK]")
		resetColor()
	} else {
		hasFailure = true
		setColor(COLOR_RED)
		fmt.Println(" [FAIL] 启动失败")
		resetColor()
	}
}

func startAppDirect() {
	pm2Path := os.Getenv("APPDATA") + "\\npm\\pm2.cmd"
	appPath := ArchiveHome + "\\app"
	cmd := exec.Command(pm2Path, "start", appPath+"\\ecosystem.config.js")
	cmd.Dir = appPath
	cmd.Run()
}

// ==================== Helpers ====================

func isPortListening(port string) bool {
	conn, err := net.DialTimeout("tcp", "127.0.0.1:"+port, 2*time.Second)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}

func waitForPort(port string, timeout time.Duration) bool {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if isPortListening(port) {
			return true
		}
		time.Sleep(500 * time.Millisecond)
	}
	return false
}

func openBrowser() {
	chromePaths := []string{
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		os.Getenv("LOCALAPPDATA") + "\\Google\\Chrome\\Application\\chrome.exe",
	}

	for _, chromePath := range chromePaths {
		if _, err := os.Stat(chromePath); err == nil {
			exec.Command(chromePath, AppURL).Start()
			return
		}
	}
	exec.Command("cmd", "/c", "start", "", AppURL).Run()
}

// countdownExit shows countdown and auto closes
func countdownExit(seconds int) {
	fmt.Println()
	for i := seconds; i > 0; i-- {
		setColor(COLOR_GRAY)
		fmt.Printf("\r窗口将在 %d 秒后自动关闭...", i)
		resetColor()
		time.Sleep(1 * time.Second)
	}
	fmt.Print("\r")
	os.Exit(0)
}

// waitForUser waits for user to press Enter (when there's an error)
func waitForUser() {
	fmt.Println()
	setColor(COLOR_GRAY)
	fmt.Println("按回车键退出...")
	resetColor()
	var input string
	fmt.Scanln(&input)
	os.Exit(1)
}
