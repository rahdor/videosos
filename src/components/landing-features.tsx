"use client";

import {
  Bot,
  Code,
  Coins,
  Film,
  HardDrive,
  Lock,
  Shield,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";

export default function Features() {
  const t = useTranslations("landing.features");

  const features = [
    {
      id: "ipLicensing",
      icon: Coins,
      title: t("ipLicensing.title"),
      description: t("ipLicensing.description"),
      highlight: true,
    },
    {
      id: "onChainOwnership",
      icon: Shield,
      title: t("onChainOwnership.title"),
      description: t("onChainOwnership.description"),
      highlight: true,
    },
    {
      id: "dualAI",
      icon: Bot,
      title: t("dualAI.title"),
      description: t("dualAI.description"),
    },
    {
      id: "privacy",
      icon: Lock,
      title: t("privacy.title"),
      description: t("privacy.description"),
    },
    {
      id: "timeline",
      icon: Film,
      title: t("timeline.title"),
      description: t("timeline.description"),
    },
    {
      id: "ipfsStorage",
      icon: HardDrive,
      title: t("ipfsStorage.title"),
      description: t("ipfsStorage.description"),
    },
    {
      id: "clientSide",
      icon: Zap,
      title: t("clientSide.title"),
      description: t("clientSide.description"),
    },
    {
      id: "openSource",
      icon: Code,
      title: t("openSource.title"),
      description: t("openSource.description"),
    },
  ];

  return (
    <section id="features" className="py-20 border-t border-white/10">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("title")}</h2>
          <p className="text-gray-400 text-lg">{t("subtitle")}</p>
        </div>

        <div className="max-w-screen-lg mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.id}
              className={`p-6 rounded-lg border transition-colors ${
                feature.highlight
                  ? "border-camp-orange/30 bg-gradient-to-b from-camp-orange/10 to-transparent hover:border-camp-orange/50"
                  : "border-white/10 bg-gradient-to-b from-white/5 to-transparent hover:border-white/20"
              }`}
            >
              <feature.icon
                className={`w-10 h-10 mb-4 ${
                  feature.highlight ? "text-camp-orange" : "text-white/80"
                }`}
              />
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
