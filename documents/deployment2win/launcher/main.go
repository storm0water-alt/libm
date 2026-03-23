package main

import (
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"syscall"
	"time"
)

const (
	Version   = "1.1.1"
	AppURL    = "http://127.0.0.1:3000"
	AppPort   = "3000"
	PgPort    = "5432"
	MeiliPort = "7700"
)

var (
	ArchiveHome string
)

func main() {
	// 设置控制台编码为 UTF-8
	setConsoleUTF8()

	// 初始化 ArchiveHome
	ArchiveHome = getArchiveHome()

	printHeader()

	// Step 1: Check Node.js
	if !checkNodeJS() {
		waitForExit("Node.js 未安装，请先安装 Node.js")
		return
	}

	// Step 2: Check and start PostgreSQL
	checkAndStartPostgreSQL()

	// Step 3: Check and start Meilisearch
	checkAndStartMeilisearch()

	// Step 4: Check and start App
	checkAndStartApp()

	// 显示最终状态
	showFinalStatus()
}

func getArchiveHome() string {
	// 1. 从可执行文件所在目录查找 config.ini
	exePath, err := os.Executable()
	if err == nil {
		exeDir := filepath.Dir(exePath)

		// 尝试多个可能的配置文件位置
		configPaths := []string{
			filepath.Join(exeDir, "config.ini"),           // launcher.exe 同目录
			filepath.Join(exeDir, "..", "config.ini"),     // 上级目录
			filepath.Join(exeDir, "..", "..", "config.ini"), // 上上级目录
		}

		for _, configPath := range configPaths {
			if data, err := os.ReadFile(configPath); err == nil {
				if home := parseConfigIni(string(data)); home != "" {
					return home
				}
			}
		}
	}

	// 2. 从常见路径查找 (优先 C 盘)
	for _, drive := range []string{"C", "D", "E"} {
		configPath := drive + ":\\ArchiveManagement\\config.ini"
		if data, err := os.ReadFile(configPath); err == nil {
			if home := parseConfigIni(string(data)); home != "" {
				return home
			}
		}
	}

	// 3. 检查哪个盘的 ArchiveManagement 目录实际存在
	for _, drive := range []string{"C", "D", "E"} {
		archiveDir := drive + ":\\ArchiveManagement"
		if _, err := os.Stat(archiveDir); err == nil {
			// 检查关键文件是否存在
			if _, err := os.Stat(archiveDir + "\\config\\.env"); err == nil {
				return archiveDir
			}
		}
	}

	return "C:\\ArchiveManagement"
}

func parseConfigIni(content string) string {
	for _, line := range strings.Split(content, "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "ARCHIVE_HOME=") {
			return strings.TrimSpace(strings.TrimPrefix(line, "ARCHIVE_HOME="))
		}
	}
	return ""
}

func setConsoleUTF8() {
	cmd := exec.Command("cmd", "/c", "chcp", "65001", ">", "nul")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	cmd.Run()
}

func printHeader() {
	fmt.Println("========================================")
	fmt.Println("    档案管理系统启动器 v" + Version)
	fmt.Println("========================================")
	fmt.Println()
	fmt.Println("安装目录: " + ArchiveHome)
	fmt.Println()
}

func printStep(step, total int, name string) {
	fmt.Printf("[%d/%d] %s", step, total, name)
}

func printOK() {
	fmt.Println(" [OK]")
}

func printFAIL(msg string) {
	fmt.Println(" [FAIL] " + msg)
}

func waitForExit(msg string) {
	fmt.Println()
	if msg != "" {
		fmt.Println("[错误] " + msg)
	}
	fmt.Println()
	fmt.Println("按任意键退出...")
	var input string
	fmt.Scanln(&input)
	os.Exit(1)
}

// ==================== Node.js ====================

func checkNodeJS() bool {
	printStep(1, 4, "Node.js")

	cmd := exec.Command("node", "--version")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	output, err := cmd.CombinedOutput()
	if err != nil {
		fmt.Println(" [未安装]")
		return false
	}

	fmt.Printf(" [OK] %s\n", strings.TrimSpace(string(output)))
	return true
}

// ==================== PostgreSQL ====================

// isPostgreSQLServiceRunning 检查 PostgreSQL Windows 服务是否正在运行
func isPostgreSQLServiceRunning() bool {
	cmd := exec.Command("sc", "query", "PostgreSQL")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	output, err := cmd.CombinedOutput()
	if err != nil {
		return false
	}
	// 检查服务状态是否为 RUNNING
	return strings.Contains(string(output), "RUNNING")
}

func checkAndStartPostgreSQL() {
	printStep(2, 4, "PostgreSQL")

	// 检查 Windows 服务状态 (参考 toolkit.ps1 的检测逻辑)
	if isPostgreSQLServiceRunning() {
		printOK()
		return
	}

	fmt.Print(" 启动中...")

	// 启动服务
	cmd := exec.Command("net", "start", "PostgreSQL")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	cmd.Run()

	// 等待
	for i := 0; i < 10; i++ {
		time.Sleep(1 * time.Second)
		if isPostgreSQLServiceRunning() {
			printOK()
			return
		}
	}

	printFAIL("启动超时")
}

// ==================== Meilisearch ====================

func checkAndStartMeilisearch() {
	printStep(3, 4, "Meilisearch")

	// 检查端口
	if isPortListening(MeiliPort) {
		printOK()
		return
	}

	fmt.Print(" 启动中...")

	// 方法1: 尝试启动 Windows 服务
	svcCmd := exec.Command("net", "start", "Meilisearch")
	svcCmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	svcCmd.Run()

	time.Sleep(3 * time.Second)
	if isPortListening(MeiliPort) {
		printOK()
		return
	}

	// 方法2: 直接启动进程
	err := startMeilisearchProcess()
	if err != nil {
		fmt.Printf("\n          直接启动失败: %v\n", err)
	}

	// 等待
	for i := 0; i < 10; i++ {
		time.Sleep(1 * time.Second)
		if isPortListening(MeiliPort) {
			printOK()
			return
		}
	}

	printFAIL("启动超时")
	fmt.Printf("         请检查: %s\\data\\meilisearch\\ 是否存在\n", ArchiveHome)
}

func startMeilisearchProcess() error {
	meiliExe := "C:\\Program Files\\Meilisearch\\meilisearch.exe"
	if _, err := os.Stat(meiliExe); err != nil {
		return fmt.Errorf("meilisearch.exe 不存在: %s", meiliExe)
	}

	// 读取 master key
	envPath := ArchiveHome + "\\config\\.env"
	data, err := os.ReadFile(envPath)
	if err != nil {
		return fmt.Errorf("无法读取配置: %s", envPath)
	}

	re := regexp.MustCompile(`MEILI_MASTER_KEY\s*=\s*(.+)`)
	matches := re.FindStringSubmatch(string(data))
	if len(matches) < 2 {
		return fmt.Errorf("配置文件中未找到 MEILI_MASTER_KEY")
	}
	masterKey := strings.TrimSpace(matches[1])

	dbPath := ArchiveHome + "\\data\\meilisearch"
	os.MkdirAll(dbPath, 0755)

	// 使用 PowerShell Start-Process 启动独立进程
	psScript := fmt.Sprintf(
		`Start-Process -FilePath '%s' -ArgumentList '--master-key=%s','--db-path=%s','--http-addr=127.0.0.1:7700' -WindowStyle Hidden`,
		meiliExe, masterKey, dbPath)

	cmd := exec.Command("powershell", "-Command", psScript)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

	return cmd.Run()
}

// ==================== App ====================

func checkAndStartApp() {
	printStep(4, 4, "应用服务")

	// 检查端口
	if isPortListening(AppPort) {
		printOK()
		return
	}

	fmt.Print(" 启动中...")

	pm2Path := os.Getenv("APPDATA") + "\\npm\\pm2.cmd"
	appPath := ArchiveHome + "\\app"
	ecoConfig := appPath + "\\ecosystem.config.js"

	// 检查文件
	if _, err := os.Stat(pm2Path); err != nil {
		printFAIL("PM2 未安装")
		return
	}

	if _, err := os.Stat(ecoConfig); err != nil {
		printFAIL("ecosystem.config.js 不存在")
		fmt.Printf("         路径: %s\n", ecoConfig)
		return
	}

	// 删除旧进程
	delCmd := exec.Command(pm2Path, "delete", "archive-management")
	delCmd.Dir = appPath
	delCmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	delCmd.Run()

	// 启动新进程 - 后台运行
	startCmd := exec.Command(pm2Path, "start", ecoConfig)
	startCmd.Dir = appPath
	startCmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

	output, err := startCmd.CombinedOutput()
	if err != nil {
		printFAIL("PM2 启动失败")
		fmt.Printf("         错误: %v\n", err)
		fmt.Printf("         输出: %s\n", string(output))
		return
	}

	// 等待
	for i := 0; i < 20; i++ {
		time.Sleep(1 * time.Second)
		if isPortListening(AppPort) {
			printOK()
			return
		}
	}

	printFAIL("启动超时")
	fmt.Printf("         请检查日志: %s\\app\\logs\\\n", ArchiveHome)
}

// ==================== Final Status ====================

func showFinalStatus() {
	fmt.Println()
	fmt.Println("========================================")
	fmt.Println("服务状态")
	fmt.Println("========================================")

	// 使用与 toolkit.ps1 一致的检测逻辑
	pgOK := isPostgreSQLServiceRunning()
	msOK := isPortListening(MeiliPort)
	appOK := isPortListening(AppPort)

	fmt.Printf("  PostgreSQL:  %s\n", statusStr(pgOK, "5432"))
	fmt.Printf("  Meilisearch: %s\n", statusStr(msOK, "7700"))
	fmt.Printf("  应用服务:    %s\n", statusStr(appOK, "3000"))
	fmt.Println()

	if pgOK && msOK && appOK {
		fmt.Println("所有服务已就绪!")
		fmt.Println("正在打开浏览器...")
		openBrowser()
		fmt.Println()
		countdownExit(10)
	} else {
		fmt.Println("部分服务启动失败!")
		fmt.Println()
		fmt.Println("排查建议:")
		fmt.Println("  1. 手动运行: powershell -File " + ArchiveHome + "\\scripts\\toolkit.ps1 start")
		fmt.Println("  2. 查看日志: " + ArchiveHome + "\\app\\logs\\")
		fmt.Println()
		waitForExit("")
	}
}

func statusStr(ok bool, port string) string {
	if ok {
		return "[运行中] 端口 " + port
	}
	return "[未运行]"
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

func openBrowser() {
	urls := []string{
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		os.Getenv("LOCALAPPDATA") + "\\Google\\Chrome\\Application\\chrome.exe",
	}

	for _, p := range urls {
		if _, err := os.Stat(p); err == nil {
			cmd := exec.Command(p, AppURL)
			cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
			cmd.Start()
			return
		}
	}

	cmd := exec.Command("cmd", "/c", "start", "", AppURL)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	cmd.Run()
}

func countdownExit(seconds int) {
	for i := seconds; i > 0; i-- {
		fmt.Printf("\r                                    \r")
		fmt.Printf("窗口将在 %d 秒后自动关闭...", i)
		time.Sleep(1 * time.Second)
	}
	fmt.Println("\r                                    \r")
	fmt.Println("再见!")
	os.Exit(0)
}
