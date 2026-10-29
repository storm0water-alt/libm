// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { authenticateUser, userExists } from "@/services/auth.service";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("bcryptjs", () => ({ compare: vi.fn() }));

const mockFindUnique = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockUpdate = prisma.user.update as unknown as ReturnType<typeof vi.fn>;
const mockCompare = compare as unknown as ReturnType<typeof vi.fn>;

const activeUser = {
  id: "u1",
  username: "admin",
  password: "$2a$10$hashed",
  role: "admin",
  status: "active",
};

describe("authenticateUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockResolvedValue(activeUser);
  });

  it("用户名密码正确时返回用户信息并记录登录时间", async () => {
    mockFindUnique.mockResolvedValue(activeUser);
    mockCompare.mockResolvedValue(true);

    const result = await authenticateUser("admin", "admin123");

    expect(result.success).toBe(true);
    expect(result.user).toEqual({ id: "u1", username: "admin", role: "admin", status: "active" });
    // 不应泄露密码哈希
    expect(result.user).not.toHaveProperty("password");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { lastLoginAt: expect.any(Date) },
    });
  });

  it("密码错误时返回统一错误提示且不更新登录时间", async () => {
    mockFindUnique.mockResolvedValue(activeUser);
    mockCompare.mockResolvedValue(false);

    const result = await authenticateUser("admin", "wrong");

    expect(result.success).toBe(false);
    expect(result.error).toBe("用户名或密码错误");
    expect(result.user).toBeUndefined();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("用户不存在时返回统一错误提示（避免用户名枚举）", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await authenticateUser("ghost", "whatever");

    expect(result.success).toBe(false);
    expect(result.error).toBe("用户名或密码错误");
    expect(mockCompare).not.toHaveBeenCalled();
  });

  it("账户被禁用时拒绝登录", async () => {
    mockFindUnique.mockResolvedValue({ ...activeUser, status: "disabled" });
    mockCompare.mockResolvedValue(true);

    const result = await authenticateUser("admin", "admin123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("账户已被禁用");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("数据库异常时返回服务不可用", async () => {
    mockFindUnique.mockRejectedValue(new Error("db down"));

    const result = await authenticateUser("admin", "admin123");

    expect(result.success).toBe(false);
    expect(result.error).toBe("认证服务暂时不可用");
  });
});

describe("userExists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("用户存在返回 true", async () => {
    mockFindUnique.mockResolvedValue({ id: "u1" });

    await expect(userExists("admin")).resolves.toBe(true);
  });

  it("用户不存在返回 false", async () => {
    mockFindUnique.mockResolvedValue(null);

    await expect(userExists("ghost")).resolves.toBe(false);
  });

  it("查询异常时返回 false", async () => {
    mockFindUnique.mockRejectedValue(new Error("db down"));

    await expect(userExists("admin")).resolves.toBe(false);
  });
});
