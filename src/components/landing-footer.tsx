"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function Footer() {
  const t = useTranslations("landing.footer");

  return (
    <footer className="border-t flex w-full border-white/10 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 max-w-screen-lg md:grid-cols-4 gap-8 mx-auto">
          <div className="flex flex-col items-start col-span-2 md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">{t("appName")}</span>
            </div>
            <p className="text-sm text-gray-400">{t("tagline")}</p>
          </div>

          <div className="flex flex-col items-start">
            <h4 className="font-semibold mb-4">{t("credits")}</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link
                  href="https://github.com/timoncool/videosos"
                  className="hover:text-white transition-colors"
                  target="_blank"
                >
                  Origin Studio
                </Link>
              </li>
              <li>
                <Link
                  href="https://t.me/nerual_dreming"
                  className="hover:text-white transition-colors"
                  target="_blank"
                >
                  Nerual Dreming
                </Link>
              </li>
              <li>
                <Link
                  href="https://artgeneration.me/"
                  className="hover:text-white transition-colors"
                  target="_blank"
                >
                  ArtGeneration.me
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col items-start">
            <h4 className="font-semibold mb-4">{t("camp")}</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link
                  href="https://www.campnetwork.xyz/"
                  className="hover:text-white transition-colors"
                  target="_blank"
                >
                  Camp Network
                </Link>
              </li>
              <li>
                <Link
                  href="https://docs.campnetwork.xyz/"
                  className="hover:text-white transition-colors"
                  target="_blank"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.campnetwork.xyz/origin"
                  className="hover:text-white transition-colors"
                  target="_blank"
                >
                  Origin Protocol
                </Link>
              </li>
            </ul>
          </div>

          <div className="flex flex-col items-start">
            <h4 className="font-semibold mb-4">{t("community")}</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link
                  href="https://github.com/anthropics/videosos"
                  className="hover:text-white transition-colors"
                >
                  {t("github")}
                </Link>
              </li>
              <li>
                <Link
                  href="https://twitter.com/campaborado"
                  className="hover:text-white transition-colors"
                  target="_blank"
                >
                  Twitter
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-center text-sm text-gray-500">
          <p>
            Built with Origin Protocol by Camp Network. Open source under MIT
            license.
          </p>
        </div>
      </div>
    </footer>
  );
}
