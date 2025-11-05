"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MerchPage() {
  return (
    <div className="p-8">
      <Card className="shadow-lg border border-gray-200 bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-t-lg">
          <CardTitle>Merch Store</CardTitle>
        </CardHeader>
        <CardContent className="text-gray-700 mt-4 space-y-2">
          <p>Caps · Hoodies · Tees · Stickers for the Move Around TMS crew.</p>
          <Button className="bg-blue-600 text-white">Shop Now</Button>
        </CardContent>
      </Card>
    </div>
  );
}