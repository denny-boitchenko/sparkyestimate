import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center px-4 text-center">
      <p className="text-5xl font-bold tracking-tight text-muted-foreground/50">404</p>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Link href="/">
        <Button variant="outline" className="mt-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to dashboard
        </Button>
      </Link>
    </div>
  );
}
