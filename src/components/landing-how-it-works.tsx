"use client";

import { PenTool, Stamp, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";

export default function HowItWorks() {
  const t = useTranslations("landing.howItWorks");

  const steps = [
    {
      number: "01",
      icon: PenTool,
      title: t("step1.title"),
      description: t("step1.description"),
    },
    {
      number: "02",
      icon: Stamp,
      title: t("step2.title"),
      description: t("step2.description"),
    },
    {
      number: "03",
      icon: Wallet,
      title: t("step3.title"),
      description: t("step3.description"),
    },
  ];

  return (
    <section className="py-20 border-t border-white/10">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t("title")}</h2>
          <p className="text-gray-400 text-lg">{t("subtitle")}</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connection lines (hidden on mobile) */}
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-camp-orange/50" />

            {steps.map((step, index) => (
              <div key={step.number} className="relative text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-camp-orange/20 border border-camp-orange/30 mb-6">
                  <step.icon className="w-10 h-10 text-camp-orange" />
                </div>
                <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-2 text-xs font-mono text-camp-orange">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-gray-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
