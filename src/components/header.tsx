"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SettingsIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";
import { WalletButton } from "./wallet-button";

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      {children}
    </Link>
  );
}

export default function Header({
  openKeyDialog,
  showTabs = true,
}: {
  openKeyDialog?: () => void;
  showTabs?: boolean;
}) {
  const t = useTranslations("app.header");
  const locale = useLocale();
  const pathname = usePathname();
  const [showKeyWarning, setShowKeyWarning] = useState(false);

  useEffect(() => {
    // Both keys are optional - FAL uses server-side proxy, Runware unlocks extra models
    setShowKeyWarning(false);
  }, []);

  return (
    <header className="px-4 py-2 flex justify-between items-center border-b border-border">
      <h1 className="text-lg font-medium">
        <Link href={`/${locale}/create`}>
          <Logo />
        </Link>
      </h1>

      {/* Tab Navigation */}
      {showTabs && (
        <nav className="flex items-center gap-1">
          <TabLink
            href={`/${locale}/create`}
            active={pathname?.includes("/create") ?? false}
          >
            Create
          </TabLink>
          <TabLink
            href={`/${locale}/studio`}
            active={pathname?.includes("/studio") ?? false}
          >
            Studio
          </TabLink>
        </nav>
      )}

      <nav className="flex flex-row items-center justify-end gap-2">
        <Button variant="ghost" size="sm" asChild>
          <a
            href="https://github.com/timoncool/videosos"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("github")}
          </a>
        </Button>
        <LanguageSwitcher />
        <WalletButton />
        {openKeyDialog && (
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={openKeyDialog}
          >
            {showKeyWarning && (
              <span className="dark:bg-orange-400 bg-orange-600 w-2 h-2 rounded-full absolute top-1 right-1" />
            )}
            <SettingsIcon className="w-6 h-6" />
          </Button>
        )}
      </nav>
    </header>
  );
}
