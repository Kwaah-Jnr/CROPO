import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t bg-card text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand & Purpose */}
          <div className="space-y-3">
            <Logo />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ghana&apos;s agricultural marketplace connecting commercial farmers directly with
              wholesalers, retailers, food processors, and catering businesses.
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              Buy Fresh. Sell Faster. Waste Less.
            </p>
          </div>

          {/* Marketplace Links */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Marketplace
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/marketplace" className="hover:text-primary transition-colors">
                  Browse All Produce
                </Link>
              </li>
              <li>
                <Link href="/marketplace?category=vegetables" className="hover:text-primary transition-colors">
                  Fresh Vegetables
                </Link>
              </li>
              <li>
                <Link href="/marketplace?category=roots-tubers" className="hover:text-primary transition-colors">
                  Roots & Tubers
                </Link>
              </li>
              <li>
                <Link href="/marketplace?category=plantain-banana" className="hover:text-primary transition-colors">
                  Plantain & Banana
                </Link>
              </li>
              <li>
                <Link href="/marketplace?category=grains-cereals" className="hover:text-primary transition-colors">
                  Grains & Cereals
                </Link>
              </li>
            </ul>
          </div>

          {/* Trade & Platform */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Trade & Information
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/how-it-works" className="hover:text-primary transition-colors">
                  How Cropo Works
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-primary transition-colors">
                  About Cropo
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-primary transition-colors">
                  Register as a Farmer
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-primary transition-colors">
                  Register as a Buyer
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-primary transition-colors">
                  Account Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Regional Agricultural Hubs */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Major Trade Hubs
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Operating across Ghanaian agricultural corridors including Kumasi Central, Ejura,
              Techiman, Bawku, Somanya, Tamale, and Agbogbloshie (Accra).
            </p>
            <div className="rounded-md border bg-background/50 p-2.5 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Currency standard:</span> Ghana Cedi (GH₵)
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {siteConfig.name} Ltd. Republic of Ghana.</p>
          <p>Agricultural Trade Platform. Built for authentic commercial exchange.</p>
        </div>
      </div>
    </footer>
  );
}
