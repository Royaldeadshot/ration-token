import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ShieldCheck, LogIn } from "lucide-react";
import { toast } from "sonner";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Please enter username and password");
      return;
    }
    setLoading(true);
    try {
      const res = await API.post("/admin/login", {
        username: username.trim(),
        password: password.trim(),
      });
      localStorage.setItem("admin_token", res.data.token);
      localStorage.setItem("admin_shop_id", res.data.shop_id);
      localStorage.setItem("admin_shop_name", res.data.shop_name);
      localStorage.setItem("admin_username", res.data.username);
      toast.success("Login successful!");
      navigate("/admin/dashboard");
    } catch (err) {
      toast.error("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md space-y-6">
        <Button
          data-testid="back-to-home-from-login"
          variant="ghost"
          onClick={() => navigate("/")}
          className="text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="border-2 shadow-lg rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="font-heading text-2xl flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-primary" />
              Admin Login
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium uppercase tracking-wider">
                  Username
                </Label>
                <Input
                  id="username"
                  data-testid="admin-username-input"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-14 text-lg border-2 focus:border-primary rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium uppercase tracking-wider">
                  Password
                </Label>
                <Input
                  id="password"
                  data-testid="admin-password-input"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 text-lg border-2 focus:border-primary rounded-lg"
                />
              </div>
              <Button
                type="submit"
                data-testid="admin-login-btn"
                disabled={loading}
                className="w-full h-14 text-lg font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md active:scale-95 transition-all"
              >
                <LogIn className="w-5 h-5 mr-2" />
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Contact shop administrator for login credentials
        </p>
      </div>
    </div>
  );
}
