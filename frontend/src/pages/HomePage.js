import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Eye, ShieldCheck, Store } from "lucide-react";

export default function HomePage() {
  const [shops, setShops] = useState([]);
  const [selectedShop, setSelectedShop] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    API.get("/shops").then((res) => setShops(res.data)).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
            <Store className="w-8 h-8 text-primary" />
          </div>
          <h1
            data-testid="app-title"
            className="font-heading text-4xl md:text-5xl font-bold tracking-tight text-foreground"
          >
            RationQueue
          </h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Get your token online. No more long queues.
          </p>
        </div>

        {/* Shop Selector Card */}
        <Card className="border-2 shadow-lg rounded-xl">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground uppercase tracking-wider">
                Select Shop
              </label>
              <Select value={selectedShop} onValueChange={setSelectedShop}>
                <SelectTrigger
                  data-testid="shop-selector"
                  className="h-14 text-lg border-2 focus:border-primary"
                >
                  <SelectValue placeholder="Choose a ration shop" />
                </SelectTrigger>
                <SelectContent>
                  {shops.map((shop) => (
                    <SelectItem
                      key={shop.id}
                      value={shop.id}
                      data-testid={`shop-option-${shop.id}`}
                    >
                      <span className="font-medium">{shop.name}</span>
                      <span className="text-muted-foreground ml-2 text-sm">
                        — {shop.address}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                data-testid="join-queue-btn"
                onClick={() => navigate(`/shop/${selectedShop}/join`)}
                disabled={!selectedShop}
                className="w-full h-14 text-lg font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md active:scale-95 transition-all"
              >
                <Users className="w-5 h-5 mr-2" />
                Join Queue
              </Button>
              <Button
                data-testid="view-counter-btn"
                onClick={() => navigate(`/shop/${selectedShop}/counter`)}
                disabled={!selectedShop}
                variant="outline"
                className="w-full h-14 text-lg font-semibold rounded-full border-2 border-primary text-primary hover:bg-primary/10 active:scale-95 transition-all"
              >
                <Eye className="w-5 h-5 mr-2" />
                View Live Counter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Admin Link */}
        <div className="text-center">
          <Button
            data-testid="admin-login-link"
            variant="ghost"
            onClick={() => navigate("/admin/login")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            Admin Login
          </Button>
        </div>
      </div>
    </div>
  );
}
