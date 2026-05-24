import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/brand/Logo";

export const Navbar = () => {
  const NavLinks = () => (
    <>
      <Link to="/">
        <Button variant="ghost" className="label-tag-muted hover:text-foreground">Início</Button>
      </Link>
      <Link to="/sobre">
        <Button variant="ghost" className="label-tag-muted hover:text-foreground">Sobre</Button>
      </Link>
      <Link to="/login">
        <Button variant="premium" size="sm">Acessar</Button>
      </Link>
    </>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <Logo size="md" />
          </Link>

          <div className="hidden md:flex items-center gap-2">
            <NavLinks />
          </div>

          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 bg-card">
              <div className="flex flex-col gap-4 mt-8">
                <NavLinks />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};
