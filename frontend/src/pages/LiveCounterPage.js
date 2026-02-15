import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Clock, RefreshCw, Ticket } from "lucide-react";

export default function LiveCounterPage() {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [counter, setCounter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchCounter = useCallback(async () => {
    try {
      const res = await API.get(`/shops/${shopId}/counter`);
      setCounter(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchCounter();
    const interval = setInterval(fetchCounter, 5000);
    return () => clearInterval(interval);
  }, [fetchCounter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!counter) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-lg text-muted-foreground">Shop not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-8">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            data-testid="back-to-home-from-counter"
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Live
          </div>
        </div>

        {/* Shop name */}
        <p
          data-testid="counter-shop-name"
          className="text-sm font-medium uppercase tracking-wider text-muted-foreground text-center"
        >
          {counter.shop_name}
        </p>

        {/* Main Counter Display */}
        <Card className="border-2 shadow-xl rounded-xl overflow-hidden">
          <div className="bg-secondary/5 border-b-2 border-secondary/10 py-10 md:py-16 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-secondary mb-4">
              Now Serving
            </p>
            {counter.current_serving ? (
              <>
                <div
                  data-testid="current-serving-number"
                  className="token-display text-7xl md:text-9xl text-secondary animate-count-pop"
                  aria-live="polite"
                >
                  {counter.current_serving.token_number}
                </div>
                <p className="mt-4 text-lg text-muted-foreground">
                  {counter.current_serving.name}
                </p>
              </>
            ) : (
              <div className="space-y-2">
                <p
                  data-testid="no-serving-message"
                  className="text-3xl md:text-4xl font-semibold text-muted-foreground/50"
                >
                  —
                </p>
                <p className="text-base text-muted-foreground">No token being served</p>
              </div>
            )}
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-xl p-4 text-center">
                <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p
                  data-testid="total-waiting-count"
                  className="token-display text-3xl text-foreground"
                >
                  {counter.total_waiting}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Waiting</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 text-center">
                <Clock className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p
                  data-testid="total-est-wait"
                  className="token-display text-3xl text-foreground"
                >
                  {Math.ceil(counter.estimated_wait_minutes)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Min total wait</p>
              </div>
            </div>

            {/* Next Tokens */}
            {counter.next_tokens.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Up Next
                </p>
                <div className="space-y-2">
                  {counter.next_tokens.map((t, i) => (
                    <div
                      key={t.id}
                      data-testid={`next-token-${i}`}
                      className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3 animate-slide-up"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className="font-mono text-base px-3 py-1 font-bold border-primary/30 text-primary"
                        >
                          #{t.token_number}
                        </Badge>
                        <span className="text-sm text-foreground">{t.name}</span>
                      </div>
                      <Ticket className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Join Queue CTA */}
            <Button
              data-testid="join-queue-from-counter"
              onClick={() => navigate(`/shop/${shopId}/join`)}
              className="w-full h-12 text-base font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md active:scale-95 transition-all"
            >
              <Ticket className="w-4 h-4 mr-2" />
              Join This Queue
            </Button>

            {/* Last updated */}
            {lastUpdated && (
              <p className="text-center text-xs text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
