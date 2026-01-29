"use client"

import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"

interface SearchResultsBannerProps {
  query: string
  total: number
  category?: string
  tags?: string[]
}

export function SearchResultsBanner({ query, total, category, tags }: SearchResultsBannerProps) {
  const router = useRouter()

  const handleBack = () => {
    router.push("/search")
  }

  return (
    <div className="bg-blue-50 border-b border-blue-200">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
              <svg
                className="h-5 w-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                搜索结果：<span className="text-blue-600">"{query}"</span>
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-gray-600">找到 {total} 个相关档案</p>
                {(category || (tags && tags.length > 0)) && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm text-gray-600">筛选：</span>
                    {category && (
                      <Badge variant="secondary" className="text-xs">
                        分类: {category}
                      </Badge>
                    )}
                    {tags && tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            返回搜索页
          </Button>
        </div>
      </div>
    </div>
  )
}
