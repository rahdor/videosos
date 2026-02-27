"use client";

import { Button } from "@/components/ui/button";
import { LaptopMockup } from "@/components/ui/landing-laptop-mockup";
import { ArrowRight, Github, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  const t = useTranslations("landing.hero");
  const locale = useLocale();

  return (
    <section className="pt-32 pb-16 md:pt-40 md:pb-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-sm mb-8">
            <a
              href="https://github.com/timoncool/videosos"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Built on Origin Studio
            </a>
            <span className="mx-2 h-4 w-px bg-white/20" />
            <Sparkles className="w-4 h-4 mr-2 text-purple-400" />
            <span className="text-purple-300">{t("badge")}</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8">
            <span className="bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">
              {t("title")}
            </span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              {t("subtitle")}
            </span>
          </h1>

          <p className="text-gray-400 text-lg md:text-xl max-w-3xl mx-auto mb-12">
            {t("description")}
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-16">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white min-w-[200px] h-12"
              asChild
            >
              <Link href={`/${locale}/create`}>
                {t("tryNow")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="min-w-[200px] h-12 border-white/20 hover:bg-white/10"
              asChild
            >
              <Link href="https://github.com/anthropics/videosos">
                <Github className="mr-2 h-5 w-5" />
                {t("starGithub")}
              </Link>
            </Button>
          </div>
        </div>

        <div className="relative group max-w-6xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/40 to-blue-500/40 blur-3xl opacity-30" />
          <LaptopMockup>
            <Image
              src="/screenshot-app.png"
              width={1200}
              height={800}
              alt={t("imageAlt")}
              className="w-full h-auto"
              priority
            />
          </LaptopMockup>

          <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-500/30 rounded-full blur-3xl opacity-30" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-blue-500/30 rounded-full blur-3xl opacity-30" />
        </div>
      </div>
    </section>
  );
}
