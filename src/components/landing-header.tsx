"use client";

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { LanguageSwitcher } from "./language-switcher";

export default function Header() {
  const t = useTranslations("landing.header");
  const locale = useLocale();

  return (
    <header className="fixed top-0 w-full border-b border-white/10 bg-black/80 backdrop-blur-md z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex flex-1">
          <Link href={`/${locale}`} className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Origin Studio
            </span>
          </Link>
        </div>

        <nav className="flex-1 hidden md:flex items-center justify-center space-x-8">
          <Link
            href="#features"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            {t("features")}
          </Link>
          <Link
            href="#community"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            {t("community")}
          </Link>
          <Link
            href="https://github.com/timoncool/videosos"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            {t("github")}
          </Link>
        </nav>

        <div className="flex flex-1 justify-end items-center space-x-4">
          <LanguageSwitcher />
          <Button
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
            asChild
          >
            <Link href={`/${locale}/create`}>{t("tryNow")}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
