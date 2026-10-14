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
	Version   = "1.1.4"
	AppURL    = "http://127.0.0.1:3000"
	AppPort   = "3000"
	PgPort    = "5432"
	MeiliPort = "7700"
)

var (
	ArchiveHome string
	logFile     *os.File
)

func main() {
	// 设置控制台编码为 UTF-8
	setConsoleUTF8()

	// 初始化 ArchiveHome
	ArchiveHome = getArchiveHome()

	// 标题（控制台 + 日志）
	bothf("========================================\n")
	bothf("    档案管理系统启动器 v" + Version + "\n")
	bothf("========================================\n")

	// 初始化日志文件（详细日志只写这里）
	initLogFile()

	bothf("\n")

	// 诊断信息 —— 仅写日志文件
	logf("[诊断] ArchiveHome = %s\n", ArchiveHome)
	logf("[诊断] APPDATA         = %s\n", os.Getenv("APPDATA"))
	logf("[诊断] LOCALAPPDATA    = %s\n", os.Getenv("LOCALAPPDATA"))
	logf("[诊断] ProgramFiles    = %s\n", os.Getenv("ProgramFiles"))
	logf("[诊断] config\\.env 存在: %v\n", fileExists(filepath.Join(ArchiveHome, "config", ".env")))
	logf("[诊断] app\\ecosystem.config.js 存在: %v\n", fileExists(filepath.Join(ArchiveHome, "app", "ecosystem.config.js")))
	logf("[诊断] data\\meilisearch 目录存在: %v\n", dirExists(filepath.Join(ArchiveHome, "data", "meilisearch")))
	logf("\n")

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

// ==================== Logging ====================

// logf 仅写日志文件（详细诊断）
func logf(format string, a ...interface{}) {
	if logFile != nil {
		fmt.Fprintf(logFile, format, a...)
	}
}

// consolef 仅写控制台（必要输出）
func consolef(format string, a ...interface{}) {
	fmt.Printf(format, a...)
}

// bothf 同时写控制台和日志文件（标题、结果等）
func bothf(format string, a ...interface{}) {
	s := fmt.Sprintf(format, a...)
	fmt.Print(s)
	if logFile != nil {
		fmt.Fprint(logFile, s)
	}
}

func initLogFile() {
	logDir := filepath.Join(ArchiveHome, "logs")
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return
	}
	ts := time.Now().Format("20060102-150405")
	path := filepath.Join(logDir, "launcher-"+ts+".log")
	if f, err := os.Create(path); err == nil {
		logFile = f
		bothf("日志文件: %s\n", path)
	}
}

func logFilePath() string {
	if logFile != nil {
		return logFile.Name()
	}
	return "(未生成)"
}

// runLogged 执行命令并把完整命令、退出码、输出写入日志文件
func runLogged(name string, dir string, args ...string) (string, int) {
	cmd := exec.Command(name, args...)
	if dir != "" {
		cmd.Dir = dir
	}
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}

	logf("    [CMD] %s %s\n", name, strings.Join(args, " "))
	if dir != "" {
		logf("          cwd = %s\n", dir)
	}

	out, err := cmd.CombinedOutput()
	code := 0
	if err != nil {
		if ee, ok := err.(*exec.ExitError); ok {
			code = ee.ExitCode()
		} else {
			code = -1
		}
	}

	logf("    [OUT] exitCode=%d\n", code)
	trimmed := strings.TrimRight(string(out), "\r\n")
	if trimmed != "" {
		for _, line := range strings.Split(trimmed, "\n") {
			logf("          | %s\n", strings.TrimRight(line, "\r"))
		}
	}
	return string(out), code
}

func findFile(candidates []string) string {
	for _, p := range candidates {
		if p == "" {
			continue
		}
		if fi, err := os.Stat(p); err == nil && !fi.IsDir() {
			logf("          [FOUND] %s\n", p)
			return p
		}
		logf("          [MISS ] %s\n", p)
	}
	return ""
}

// redactArgs 将参数中的敏感值替换为占位符，避免写入日志
func redactArgs(args []string, secret string) []string {
	out := make([]string, len(args))
	for i, a := range args {
		if secret != "" {
			out[i] = strings.ReplaceAll(a, secret, "***REDACTED***")
		} else {
			out[i] = a
		}
	}
	return out
}

func fileExists(p string) bool {
	fi, err := os.Stat(p)
	return err == nil && !fi.IsDir()
}

func dirExists(p string) bool {
	fi, err := os.Stat(p)
	return err == nil && fi.IsDir()
}

// portStatus 检测端口是否监听（同时探测 IPv4 127.0.0.1 与 localhost，兼容 IPv6 绑定）
func portStatus(port string) bool {
	for _, a := range []string{"127.0.0.1:" + port, "localhost:" + port} {
		conn, err := net.DialTimeout("tcp", a, 2*time.Second)
		if err == nil {
			_ = conn.Close()
			return true
		}
	}
	return false
}

// checkPort 带日志的端口检测（仅写日志）
func checkPort(port, label string) bool {
	ok := portStatus(port)
	state := "NOT LISTENING"
	if ok {
		state = "LISTENING"
	}
	logf("    [PORT] %s (:%s) = %s\n", label, port, state)
	return ok
}

func dumpTail(path string) {
	data, err := os.ReadFile(path)
	if err != nil {
		logf("    [LOG] (无日志) %s\n", path)
		return
	}
	lines := strings.Split(strings.TrimRight(string(data), "\r\n"), "\n")
	start := 0
	if len(lines) > 40 {
		start = len(lines) - 40
	}
	logf("    [LOG] %s (最近 %d 行):\n", path, len(lines)-start)
	for _, line := range lines[start:] {
		logf("          | %s\n", strings.TrimRight(line, "\r"))
	}
}

// ==================== 基础 ====================

func getArchiveHome() string {
	exePath, err := os.Executable()
	if err == nil {
		exeDir := filepath.Dir(exePath)
		configPaths := []string{
			filepath.Join(exeDir, "config.ini"),
			filepath.Join(exeDir, "..", "config.ini"),
			filepath.Join(exeDir, "..", "..", "config.ini"),
		}
		for _, configPath := range configPaths {
			if data, err := os.ReadFile(configPath); err == nil {
				if home := parseConfigIni(string(data)); home != "" {
					return home
				}
			}
		}
	}

	for _, drive := range []string{"C", "D", "E"} {
		configPath := drive + ":\\ArchiveManagement\\config.ini"
		if data, err := os.ReadFile(configPath); err == nil {
			if home := parseConfigIni(string(data)); home != "" {
				return home
			}
		}
	}

	for _, drive := range []string{"C", "D", "E"} {
		archiveDir := drive + ":\\ArchiveManagement"
		if _, err := os.Stat(archiveDir); err == nil {
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
	// 通过 Win32 API 设置控制台代码页为 UTF-8，避免通过 shell 调用 chcp
	kernel32 := syscall.NewLazyDLL("kernel32.dll")
	if p := kernel32.NewProc("SetConsoleOutputCP"); p != nil {
		_, _, _ = p.Call(65001)
	}
	if p := kernel32.NewProc("SetConsoleCP"); p != nil {
		_, _, _ = p.Call(65001)
	}
}

func waitForExit(msg string) {
	consolef("\n")
	if msg != "" {
		consolef("[错误] %s\n", msg)
	}
	consolef("详细日志: %s\n", logFilePath())
	consolef("\n按任意键退出...\n")
	if logFile != nil {
		_ = logFile.Sync()
	}
	var input string
	_, _ = fmt.Scanln(&input)
	os.Exit(1)
}

// ==================== Node.js ====================

func checkNodeJS() bool {
	logf("\n========================================\n")
	logf("[1/4] Node.js\n")
	logf("========================================\n")

	consolef("[1/4] Node.js\n")

	out, code := runLogged("node", "", "--version")
	if code != 0 {
		logf("[RESULT] Node.js 未安装或不可用\n")
		consolef("  -> 失败\n")
		return false
	}
	ver := strings.TrimSpace(out)
	logf("[RESULT] Node.js OK: %s\n", ver)
	consolef("  -> OK (%s)\n", ver)
	return true
}

// ==================== PostgreSQL ====================

func pgRunningSilent() bool {
	cmd := exec.Command("sc", "query", "PostgreSQL")
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	out, err := cmd.CombinedOutput()
	if err != nil {
		return false
	}
	return strings.Contains(string(out), "RUNNING")
}

func checkAndStartPostgreSQL() {
	logf("\n========================================\n")
	logf("[2/4] PostgreSQL\n")
	logf("========================================\n")

	consolef("[2/4] PostgreSQL\n")

	out, code := runLogged("sc", "", "query", "PostgreSQL")
	if code == 0 && strings.Contains(out, "RUNNING") {
		logf("[RESULT] PostgreSQL 服务已在运行\n")
		consolef("  -> 已运行\n")
		return
	}

	logf("  尝试启动 PostgreSQL 服务...\n")
	_, _ = runLogged("net", "", "start", "PostgreSQL")

	for i := 0; i < 10; i++ {
		time.Sleep(1 * time.Second)
		if portStatus(PgPort) {
			logf("[RESULT] PostgreSQL 启动成功 (端口 5432)\n")
			consolef("  -> OK\n")
			return
		}
	}
	logf("[RESULT] PostgreSQL 启动超时\n")
	consolef("  -> 失败\n")
}

// ==================== Meilisearch ====================

func checkAndStartMeilisearch() {
	logf("\n========================================\n")
	logf("[3/4] Meilisearch\n")
	logf("========================================\n")

	consolef("[3/4] Meilisearch\n")

	if checkPort(MeiliPort, "Meilisearch") {
		logf("[RESULT] Meilisearch 已在运行\n")
		consolef("  -> 已运行\n")
		return
	}

	logf("  开始启动 Meilisearch...\n")

	// 先清理旧实例（等价 toolkit.ps1 的 Stop-Meilisearch）
	logf("  [清理] 停止旧 Meilisearch 实例...\n")
	_, _ = runLogged("net", "", "stop", "Meilisearch")
	_, _ = runLogged("taskkill", "", "/F", "/IM", "meilisearch.exe")
	time.Sleep(1 * time.Second)

	// 方法1: 尝试启动 Windows 服务
	logf("  [1/2] 尝试 net start Meilisearch (服务方式)...\n")
	_, code := runLogged("net", "", "start", "Meilisearch")
	time.Sleep(3 * time.Second)
	if portStatus(MeiliPort) {
		logf("[RESULT] Meilisearch 服务启动成功\n")
		consolef("  -> OK\n")
		return
	}
	logf("  [结果] 服务方式未成功 (net start exitCode=%d)，改用直接启动进程...\n", code)

	// 方法2: 直接启动进程
	logf("  [2/2] 直接启动 meilisearch.exe ...\n")
	startMeilisearchProcess()
	time.Sleep(3 * time.Second)

	dumpTail(filepath.Join(ArchiveHome, "logs", "meilisearch-stderr.log"))
	dumpTail(filepath.Join(ArchiveHome, "logs", "meilisearch-stdout.log"))

	for i := 0; i < 10; i++ {
		time.Sleep(1 * time.Second)
		if portStatus(MeiliPort) {
			logf("[RESULT] Meilisearch 启动成功\n")
			consolef("  -> OK\n")
			return
		}
	}

	logf("[RESULT] Meilisearch 启动超时\n")
	logf("  请检查: %s\\data\\meilisearch\\\n", ArchiveHome)
	consolef("  -> 失败\n")
}

func startMeilisearchProcess() {
	candidates := []string{
		"C:\\Program Files\\Meilisearch\\meilisearch.exe",
		"C:\\Program Files (x86)\\Meilisearch\\meilisearch.exe",
	}
	if pf := os.Getenv("ProgramFiles"); pf != "" {
		candidates = append(candidates, filepath.Join(pf, "Meilisearch", "meilisearch.exe"))
	}
	if p, err := exec.LookPath("meilisearch"); err == nil {
		candidates = append(candidates, p)
	}

	logf("    查找 meilisearch.exe:\n")
	meiliExe := findFile(candidates)
	if meiliExe == "" {
		logf("    [ERROR] 未找到 meilisearch.exe\n")
		return
	}

	envPath := filepath.Join(ArchiveHome, "config", ".env")
	logf("    读取配置: %s\n", envPath)
	if !fileExists(envPath) {
		logf("    [ERROR] 配置文件不存在（请确认已从 .env.template 生成 .env）\n")
		return
	}
	data, err := os.ReadFile(envPath)
	if err != nil {
		logf("    [ERROR] 读取配置失败: %v\n", err)
		return
	}

	re := regexp.MustCompile(`(?m)^\s*MEILI_MASTER_KEY\s*=\s*(.+?)\s*$`)
	m := re.FindStringSubmatch(string(data))
	if len(m) < 2 {
		logf("    [ERROR] 配置中未找到 MEILI_MASTER_KEY 行\n")
		for _, line := range strings.Split(string(data), "\n") {
			if strings.Contains(line, "MEILI") {
				logf("          相关行: %s\n", line)
			}
		}
		return
	}
	masterKey := strings.TrimSpace(m[1])
	logf("    [ENV] MEILI_MASTER_KEY 已读取 (长度=%d, 值已隐藏)\n", len(masterKey))

	dbPath := filepath.Join(ArchiveHome, "data", "meilisearch")
	if err := os.MkdirAll(dbPath, 0755); err != nil {
		logf("    [WARN] 无法创建 db 目录: %v\n", err)
	}
	logf("    [DB ] db-path = %s\n", dbPath)

	logDir := filepath.Join(ArchiveHome, "logs")
	_ = os.MkdirAll(logDir, 0755)
	stdoutLog := filepath.Join(logDir, "meilisearch-stdout.log")
	stderrLog := filepath.Join(logDir, "meilisearch-stderr.log")

	// 直接参数化启动 meilisearch.exe，避免通过 shell 拼接命令
	args := []string{
		"--master-key=" + masterKey,
		"--db-path=" + dbPath,
		"--http-addr=localhost:7700",
	}
	logf("    [EXEC] %s %s\n", meiliExe, strings.Join(redactArgs(args, masterKey), " "))

	outF, err := os.Create(stdoutLog)
	if err != nil {
		logf("    [ERROR] 无法创建 stdout 日志: %v\n", err)
		return
	}
	defer outF.Close()

	errF, err := os.Create(stderrLog)
	if err != nil {
		logf("    [ERROR] 无法创建 stderr 日志: %v\n", err)
		return
	}
	defer errF.Close()

	cmd := exec.Command(meiliExe, args...)
	// DETACHED_PROCESS(0x8)：让 meilisearch 完全脱离 launcher 控制台，
	// 保证 launcher 退出后 meilisearch 仍能独立运行（等价于 Start-Process 的新控制台行为）
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x00000008}
	cmd.Stdout = outF
	cmd.Stderr = errF

	if err := cmd.Start(); err != nil {
		logf("    [ERROR] 启动 meilisearch 失败: %v\n", err)
		return
	}
	pid := cmd.Process.Pid
	_ = cmd.Process.Release()
	logf("    [结果] meilisearch 已启动 (pid=%d)\n", pid)
}

// ==================== App ====================

func checkAndStartApp() {
	logf("\n========================================\n")
	logf("[4/4] 应用服务\n")
	logf("========================================\n")

	consolef("[4/4] 应用服务\n")

	if checkPort(AppPort, "应用服务") {
		logf("[RESULT] 应用服务已在运行\n")
		consolef("  -> 已运行\n")
		return
	}

	logf("  开始启动应用服务...\n")
	logf("  [ENV] APPDATA = %s\n", os.Getenv("APPDATA"))

	// 定位 pm2.cmd
	var pm2Candidates []string
	if ad := os.Getenv("APPDATA"); ad != "" {
		pm2Candidates = append(pm2Candidates, filepath.Join(ad, "npm", "pm2.cmd"))
	}
	if p, err := exec.LookPath("pm2"); err == nil {
		pm2Candidates = append(pm2Candidates, p)
	}
	if p, err := exec.LookPath("pm2.cmd"); err == nil {
		pm2Candidates = append(pm2Candidates, p)
	}

	logf("  查找 pm2.cmd:\n")
	pm2Path := findFile(pm2Candidates)
	if pm2Path == "" {
		logf("  [ERROR] 未找到 pm2.cmd，检查以下路径:\n")
		for _, p := range pm2Candidates {
			logf("      - %s\n", p)
		}
		logf("  提示: 运行 `npm config get prefix` 查看 npm 全局安装目录\n")
		consolef("  -> 失败 (PM2 未安装)\n")
		return
	}

	appPath := filepath.Join(ArchiveHome, "app")
	ecoConfig := filepath.Join(appPath, "ecosystem.config.js")
	logf("  [APP] app 目录 = %s\n", appPath)
	if !fileExists(ecoConfig) {
		logf("  [ERROR] ecosystem.config.js 不存在: %s\n", ecoConfig)
		consolef("  -> 失败 (ecosystem.config.js 不存在)\n")
		return
	}
	logf("  [APP] ecosystem.config.js 存在\n")

	// 清理旧实例（等价 toolkit.ps1 的 Stop-App）
	logf("  [清理] 停止旧实例...\n")
	_, _ = runLogged(pm2Path, appPath, "stop", "archive-management")
	_, _ = runLogged(pm2Path, appPath, "delete", "archive-management")
	_, _ = runLogged("taskkill", "", "/F", "/IM", "node.exe")
	time.Sleep(2 * time.Second)

	// 启动
	logf("  [启动] pm2 start ecosystem.config.js ...\n")
	_, code := runLogged(pm2Path, appPath, "start", ecoConfig)
	if code != 0 {
		logf("  [WARN] pm2 start 返回 exitCode=%d\n", code)
	}

	logf("  等待端口 3000 就绪...\n")
	for i := 0; i < 25; i++ {
		time.Sleep(1 * time.Second)
		if portStatus(AppPort) {
			logf("[RESULT] 应用服务启动成功\n")
			consolef("  -> OK\n")
			return
		}
	}

	logf("[RESULT] 应用服务启动超时\n")
	logf("  --- PM2 进程列表 ---\n")
	_, _ = runLogged(pm2Path, appPath, "list")
	logf("  --- PM2 日志 (最近 50 行) ---\n")
	_, _ = runLogged(pm2Path, appPath, "logs", "archive-management", "--lines", "50", "--nostream")
	logf("  日志文件目录: %s\\app\\logs\\\n", ArchiveHome)
	consolef("  -> 失败\n")
}

// ==================== Final Status ====================

func showFinalStatus() {
	logf("\n========================================\n")
	logf("服务状态\n")
	logf("========================================\n")

	pgOK := pgRunningSilent()
	msOK := portStatus(MeiliPort)
	appOK := portStatus(AppPort)

	logf("  PostgreSQL:  %s\n", statusStr(pgOK, "5432"))
	logf("  Meilisearch: %s\n", statusStr(msOK, "7700"))
	logf("  应用服务:    %s\n", statusStr(appOK, "3000"))
	logf("\n")

	consolef("\n")

	if pgOK && msOK && appOK {
		bothf("所有服务已就绪，10 秒后自动关闭窗口...\n")
		openBrowser()
		countdownExit(10)
	} else {
		consolef("部分服务启动失败：\n")
		if !pgOK {
			consolef("  - PostgreSQL 未运行\n")
		}
		if !msOK {
			consolef("  - Meilisearch 未运行\n")
		}
		if !appOK {
			consolef("  - 应用服务 未运行\n")
		}
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
			_ = cmd.Start()
			return
		}
	}

	// 兜底：用系统默认浏览器打开（rundll32 是系统自带 exe，直接参数化调用，无 shell）
	cmd := exec.Command("rundll32.exe", "url.dll,FileProtocolHandler", AppURL)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	_ = cmd.Start()
}

func countdownExit(seconds int) {
	for i := seconds; i > 0; i-- {
		consolef("\r窗口将在 %d 秒后自动关闭... ", i)
		time.Sleep(1 * time.Second)
	}
	consolef("\n")
	if logFile != nil {
		_ = logFile.Sync()
	}
	os.Exit(0)
}
