"use client";

import { Button } from "@/components/ui/button";
import { ExternalLink, Github } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export default function Community() {
  const t = useTranslations("landing.community");

  return (
    <section id="community" className="py-20 border-t border-white/10">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-camp-orange/20 border border-camp-orange/30 mb-6">
            <svg
              className="w-8 h-8 text-camp-orange"
              viewBox="0 0 24 24"
              fill="currentColor"
              role="img"
              aria-label="Camp Network"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("title")}</h2>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            {t("description")}
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="https://www.campnetwork.xyz/">
              <Button
                size="lg"
                className="bg-camp-orange hover:bg-camp-orange-light"
              >
                {t("learnMore")}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="https://github.com/anthropics/videosos">
              <Button variant="outline" size="lg">
                <Github className="mr-2 h-5 w-5" />
                {t("starGithub")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
