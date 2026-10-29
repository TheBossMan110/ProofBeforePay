import { Footer } from "@/components/layout/Footer";
import { Nav } from "@/components/layout/Nav";
import { Preloader } from "@/components/layout/Preloader";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Preloader />
      <Nav />
      <main className="min-h-[100svh]">{children}</main>
      <Footer />
    </>
  );
}
