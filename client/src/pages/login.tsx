import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Login() {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) return;
    setSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/auth/login", { username, password });
      // Populate the auth cache directly from the login response so the gate
      // swaps in the app immediately (no refetch race).
      const user = await res.json().catch(() => null);
      if (user && user.id) {
        queryClient.setQueryData(["/api/auth/me"], user);
      } else {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }
    } catch (err: any) {
      // apiRequest throws "<status>: <body>". 401 = bad credentials; anything
      // else (500, network) is a server problem, not the user's password.
      const isAuthError = String(err?.message || "").startsWith("401");
      toast({
        title: "Login failed",
        description: isAuthError
          ? "Invalid username or password."
          : "Could not reach the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight text-primary">
            SparkyEstimate
          </CardTitle>
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <div className="mt-4 border-t pt-4 text-center">
            <a
              href="/employee"
              className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
            >
              Field employee? Sign in with your PIN
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
