import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Ticket } from "lucide-react";
import { toast } from "sonner";

export default function JoinQueuePage() {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const [shopName, setShopName] = useState("");
  const [name, setName] = useState("");
  const [rationCard, setRationCard] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    API.get("/shops").then((res) => {
      const shop = res.data.find((s) => s.id === shopId);
      if (shop) setShopName(shop.name);
    });
  }, [shopId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !rationCard.trim()) {
      toast.error("Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await API.post("/tokens/generate", {
        name: name.trim(),
        ration_card: rationCard.trim(),
        shop_id: shopId,
      });
      toast.success(`Token #${res.data.token_number} generated!`);
      navigate(`/shop/${shopId}/token/${res.data.id}`);
    } catch (err) {
      toast.error("Failed to generate token. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md space-y-6">
        {/* Back button */}
        <Button
          data-testid="back-to-home"
          variant="ghost"
          onClick={() => navigate("/")}
          className="text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Shop name */}
        {shopName && (
          <p
            data-testid="shop-name-display"
            className="text-sm font-medium uppercase tracking-wider text-muted-foreground"
          >
            {shopName}
          </p>
        )}

        {/* Form Card */}
        <Card className="border-2 shadow-lg rounded-xl">
          <CardHeader className="pb-4">
            <CardTitle className="font-heading text-2xl flex items-center gap-3">
              <Ticket className="w-6 h-6 text-primary" />
              Get Your Token
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium uppercase tracking-wider">
                  Your Name
                </Label>
                <Input
                  id="name"
                  data-testid="name-input"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-14 text-lg border-2 focus:border-primary rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ration-card" className="text-sm font-medium uppercase tracking-wider">
                  Ration Card Number
                </Label>
                <Input
                  id="ration-card"
                  data-testid="ration-card-input"
                  placeholder="Enter ration card number"
                  value={rationCard}
                  onChange={(e) => setRationCard(e.target.value)}
                  className="h-14 text-lg border-2 focus:border-primary rounded-lg"
                />
              </div>
              <Button
                type="submit"
                data-testid="generate-token-btn"
                disabled={loading}
                className="w-full h-14 text-lg font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md active:scale-95 transition-all"
              >
                {loading ? "Generating..." : "Generate Token"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
