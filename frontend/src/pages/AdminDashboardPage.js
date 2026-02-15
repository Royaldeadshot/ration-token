import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  SkipForward,
  CheckCircle2,
  XCircle,
  RotateCcw,
  LogOut,
  ChevronRight,
  Users,
  Clock,
  RefreshCw,
  Store,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [counter, setCounter] = useState(null);
  const [loading, setLoading] = useState(true);

  const shopId = localStorage.getItem("admin_shop_id");
  const shopName = localStorage.getItem("admin_shop_name");
  const adminToken = localStorage.getItem("admin_token");

  useEffect(() => {
    if (!adminToken || !shopId) {
      navigate("/admin/login");
    }
  }, [adminToken, shopId, navigate]);

  const fetchData = useCallback(async () => {
    if (!shopId) return;
    try {
      const [queueRes, counterRes] = await Promise.all([
        API.get(`/shops/${shopId}/queue`),
        API.get(`/shops/${shopId}/counter`),
      ]);
      setQueue(queueRes.data);
      setCounter(counterRes.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate("/admin/login");
      }
    } finally {
      setLoading(false);
    }
  }, [shopId, navigate]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleNext = async () => {
    try {
      const res = await API.post("/admin/next");
      toast.success(
        res.data.now_serving
          ? `Now serving token #${res.data.now_serving}`
          : "No more tokens"
      );
      fetchData();
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const handleSkip = async (tokenId) => {
    try {
      await API.post(`/admin/skip/${tokenId}`);
      toast.success("Token skipped");
      fetchData();
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const handleServe = async (tokenId) => {
    try {
      await API.post(`/admin/serve/${tokenId}`);
      toast.success("Token marked as served");
      fetchData();
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const handleReset = async () => {
    try {
      await API.post("/admin/reset");
      toast.success("Queue reset successfully");
      fetchData();
    } catch (err) {
      toast.error("Reset failed");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_shop_id");
    localStorage.removeItem("admin_shop_name");
    localStorage.removeItem("admin_username");
    navigate("/admin/login");
  };

  const statusConfig = {
    waiting: { label: "Waiting", className: "bg-primary/15 text-primary" },
    serving: { label: "Serving", className: "bg-secondary/15 text-secondary" },
    served: { label: "Served", className: "bg-muted text-muted-foreground" },
    skipped: { label: "Skipped", className: "bg-destructive/15 text-destructive" },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const waitingTokens = queue.filter((t) => t.status === "waiting");
  const servingToken = queue.find((t) => t.status === "serving");

  return (
    <div data-testid="admin-dashboard" className="min-h-screen pb-32 md:pb-8">
      {/* Top Bar */}
      <div className="bg-card border-b-2 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Store className="w-5 h-5 text-primary" />
            <div>
              <p data-testid="admin-shop-name" className="font-heading font-semibold text-foreground">
                {shopName}
              </p>
              <p className="text-xs text-muted-foreground">Admin Dashboard</p>
            </div>
          </div>
          <Button
            data-testid="admin-logout-btn"
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground"
          >
            <LogOut className="w-4 h-4 mr-1" />
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <Card className="rounded-xl border-2">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Serving</p>
              <p
                data-testid="admin-current-serving"
                className="token-display text-3xl md:text-4xl text-secondary mt-1"
              >
                {servingToken ? `#${servingToken.token_number}` : "—"}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-2">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Waiting</p>
              <p
                data-testid="admin-waiting-count"
                className="token-display text-3xl md:text-4xl text-primary mt-1"
              >
                {counter?.total_waiting ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-2">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Est. Wait</p>
              <p
                data-testid="admin-est-wait"
                className="token-display text-3xl md:text-4xl text-foreground mt-1"
              >
                {counter ? Math.ceil(counter.estimated_wait_minutes) : 0}m
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action: Next Token */}
        <Button
          data-testid="admin-next-token-btn"
          onClick={handleNext}
          className="w-full h-14 text-lg font-semibold rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg active:scale-95 transition-all"
        >
          <ChevronRight className="w-5 h-5 mr-2" />
          Next Token
        </Button>

        {/* Queue Table */}
        <Card className="rounded-xl border-2">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Token Queue
              </span>
              <span className="text-sm font-normal text-muted-foreground">
                {queue.length} total
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {queue.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p className="text-base">No tokens yet</p>
                <p className="text-sm mt-1">Queue is empty</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="font-semibold">#</TableHead>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queue.map((token) => {
                      const st = statusConfig[token.status] || statusConfig.waiting;
                      return (
                        <TableRow
                          key={token.id}
                          data-testid={`queue-row-${token.token_number}`}
                          className={token.status === "serving" ? "bg-secondary/5" : ""}
                        >
                          <TableCell className="font-mono font-bold text-base">
                            {token.token_number}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{token.name}</p>
                              <p className="text-xs text-muted-foreground">{token.ration_card}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs rounded-full ${st.className}`}>
                              {token.status === "serving" && (
                                <span className="status-dot status-dot-serving mr-1.5" />
                              )}
                              {st.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {(token.status === "waiting" || token.status === "serving") && (
                              <div className="flex items-center justify-end gap-1">
                                {token.status === "serving" && (
                                  <Button
                                    data-testid={`serve-btn-${token.token_number}`}
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleServe(token.id)}
                                    className="h-8 px-2 text-primary hover:bg-primary/10"
                                    title="Mark as served"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  data-testid={`skip-btn-${token.token_number}`}
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSkip(token.id)}
                                  className="h-8 px-2 text-destructive hover:bg-destructive/10"
                                  title="Skip token"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reset Queue */}
        <Dialog>
          <DialogTrigger asChild>
            <Button
              data-testid="admin-reset-queue-btn"
              variant="outline"
              className="w-full h-12 text-base font-medium rounded-full border-2 border-destructive text-destructive hover:bg-destructive/10"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Queue
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">Reset Queue?</DialogTitle>
              <DialogDescription>
                This will remove all tokens and reset the counter to zero. This action cannot be
                undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button data-testid="cancel-reset-btn" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <DialogClose asChild>
                <Button
                  data-testid="confirm-reset-btn"
                  variant="destructive"
                  onClick={handleReset}
                >
                  Yes, Reset Queue
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Live indicator */}
        <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Auto-refreshing every 5 seconds
        </p>
      </div>
    </div>
  );
}
