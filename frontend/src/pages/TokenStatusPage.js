import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Users, RefreshCw, Eye } from "lucide-react";

export default function TokenStatusPage() {
  const { shopId, tokenId } = useParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await API.get(`/tokens/${tokenId}/status`);
      setToken(res.data);
      // Validate localStorage against reset version
      const stored = localStorage.getItem("user_token_data");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (
            parsed.tokenId === tokenId &&
            res.data.queue_reset_version !== parsed.resetVersion
          ) {
            localStorage.removeItem("user_token_data");
            setExpired(true);
          }
        } catch {}
      }
    } catch (err) {
      // Token might have been deleted (queue reset)
      localStorage.removeItem("user_token_data");
      setExpired(true);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tokenId]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const statusConfig = {
    waiting: {
      label: "Waiting",
      color: "bg-primary/15 text-primary border-primary/30",
    },
    serving: {
      label: "Now Serving",
      color: "bg-secondary/15 text-secondary border-secondary/30",
    },
    served: { label: "Served", color: "bg-muted text-muted-foreground" },
    skipped: {
      label: "Skipped",
      color: "bg-destructive/15 text-destructive border-destructive/30",
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (expired && !token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-4">
        <p className="text-lg text-muted-foreground">
          This token has expired. The queue was reset.
        </p>
        <Button
          data-testid="go-home-expired"
          onClick={() => navigate("/")}
          className="rounded-full bg-primary text-primary-foreground"
        >
          Go Home
        </Button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-lg text-muted-foreground">Token not found</p>
      </div>
    );
  }

  const status = statusConfig[token.status] || statusConfig.waiting;

  // Calculate "next day" indicator
  let isNextDay = false;
  if (
    token.status === "waiting" &&
    token.estimated_wait_minutes > 0 &&
    token.queue_end_time
  ) {
    const now = new Date();
    const [endH, endM] = token.queue_end_time.split(":").map(Number);
    const endMinutes = endH * 60 + endM;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const remainingToday = endMinutes - currentMinutes;
    isNextDay = remainingToday > 0 && token.estimated_wait_minutes > remainingToday;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md space-y-6">
        <Button
          data-testid="back-to-home-from-status"
          variant="ghost"
          onClick={() => navigate("/")}
          className="text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Token Card */}
        <Card className="border-2 shadow-lg rounded-xl overflow-hidden">
          {/* Token Number Header */}
          <div className="bg-primary/5 border-b-2 border-primary/10 p-8 text-center">
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Your Token
            </p>
            <div
              data-testid="token-number-display"
              className="token-display text-7xl md:text-8xl text-primary animate-count-pop"
            >
              {token.token_number}
            </div>
            <p
              data-testid="token-holder-name"
              className="mt-3 text-lg font-medium text-foreground"
            >
              {token.name}
            </p>
          </div>

          <CardContent className="p-6 space-y-5">
            {/* Status Badge */}
            <div className="flex justify-center">
              <Badge
                data-testid="token-status-badge"
                className={`px-4 py-2 text-base font-semibold rounded-full ${status.color}`}
              >
                {token.status === "serving" && (
                  <span className="status-dot status-dot-serving mr-2" />
                )}
                {status.label}
              </Badge>
            </div>

            {/* Queue Status */}
            {token.queue_status && (
              <div
                data-testid="token-queue-status"
                className="flex items-center justify-center gap-3 text-sm"
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    token.queue_status === "live"
                      ? "bg-green-500 animate-pulse"
                      : "bg-red-500"
                  }`}
                />
                <span className="text-muted-foreground">
                  {token.queue_status === "live"
                    ? "Queue is LIVE"
                    : `Queue STOPPED — starts ${token.queue_start_time}`}
                </span>
              </div>
            )}

            {/* Info Grid */}
            {(token.status === "waiting" || token.status === "serving") && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <Users className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <p
                    data-testid="tokens-ahead-count"
                    className="token-display text-3xl text-foreground"
                  >
                    {token.tokens_ahead}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Ahead of you</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <Clock className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <p
                    data-testid="estimated-wait-time"
                    className="token-display text-3xl text-foreground"
                  >
                    {Math.ceil(token.estimated_wait_minutes)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Min wait</p>
                </div>
              </div>
            )}

            {/* Next Day Indicator */}
            {isNextDay && (
              <div
                data-testid="next-day-indicator"
                className="bg-secondary/10 border border-secondary/20 rounded-lg p-3 text-center"
              >
                <p className="text-sm font-medium text-secondary">
                  Your token will be served next day
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Queue closes at {token.queue_end_time}
                </p>
              </div>
            )}

            {/* Live Counter Link */}
            <Button
              data-testid="view-counter-from-status"
              variant="outline"
              onClick={() => navigate(`/shop/${shopId}/counter`)}
              className="w-full h-12 text-base font-medium rounded-full border-2 border-primary text-primary hover:bg-primary/10"
            >
              <Eye className="w-4 h-4 mr-2" />
              View Live Counter
            </Button>

            {/* Auto-refresh indicator */}
            <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
              <RefreshCw className="w-3 h-3" />
              Updates every 5 seconds
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
