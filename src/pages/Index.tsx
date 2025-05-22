
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertTriangle, RotateCcw, Users, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Flatmate {
  id: string;
  name: string;
  tasksCompleted: number;
  color: string;
}

interface Chore {
  id: string;
  name: string;
  currentTurn: number;
  frequency: string;
  lastCompleted?: Date;
}

interface ShoppingItem {
  id: string;
  name: string;
  isLow: boolean;
  flaggedBy?: string;
  assignedTo: number;
}

const Index = () => {
  const { toast } = useToast();
  
  const [flatmates] = useState<Flatmate[]>([
    { id: "1", name: "Alex", tasksCompleted: 8, color: "bg-blue-500" },
    { id: "2", name: "Sam", tasksCompleted: 6, color: "bg-green-500" },
    { id: "3", name: "Jordan", tasksCompleted: 7, color: "bg-purple-500" },
  ]);

  const [chores, setChores] = useState<Chore[]>([
    { id: "1", name: "Take out bins", currentTurn: 0, frequency: "Weekly" },
    { id: "2", name: "Clean bathroom", currentTurn: 1, frequency: "Bi-weekly" },
    { id: "3", name: "Vacuum living room", currentTurn: 2, frequency: "Weekly" },
    { id: "4", name: "Clean kitchen", currentTurn: 0, frequency: "Weekly" },
  ]);

  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([
    { id: "1", name: "Toilet Paper", isLow: true, flaggedBy: "Sam", assignedTo: 1 },
    { id: "2", name: "Dish Soap", isLow: false, assignedTo: 2 },
    { id: "3", name: "Milk", isLow: true, flaggedBy: "Alex", assignedTo: 0 },
    { id: "4", name: "Cleaning Supplies", isLow: false, assignedTo: 1 },
  ]);

  const completeChore = (choreId: string) => {
    setChores(prev => prev.map(chore => {
      if (chore.id === choreId) {
        const nextTurn = (chore.currentTurn + 1) % flatmates.length;
        return {
          ...chore,
          currentTurn: nextTurn,
          lastCompleted: new Date()
        };
      }
      return chore;
    }));

    toast({
      title: "Chore completed! 🎉",
      description: "Great job! The task has been rotated to the next person.",
    });
  };

  const completeShopping = (itemId: string) => {
    setShoppingItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const nextAssignee = (item.assignedTo + 1) % flatmates.length;
        return {
          ...item,
          isLow: false,
          flaggedBy: undefined,
          assignedTo: nextAssignee
        };
      }
      return item;
    }));

    toast({
      title: "Shopping completed! 🛒",
      description: "Thanks for getting the supplies! Assignment rotated.",
    });
  };

  const flagItem = (itemId: string, flaggerName: string) => {
    setShoppingItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          isLow: true,
          flaggedBy: flaggerName
        };
      }
      return item;
    }));

    toast({
      title: "Item flagged as low! ⚠️",
      description: `${flaggerName} flagged this item as running low.`,
    });
  };

  const urgentItems = shoppingItems.filter(item => item.isLow);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🏠 Flatmate Flow
          </h1>
          <p className="text-lg text-gray-600">
            Keep track of chores, shopping, and responsibilities
          </p>
        </div>

        {/* Urgent Alerts */}
        {urgentItems.length > 0 && (
          <Card className="mb-8 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="h-5 w-5" />
                Urgent Items Needed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {urgentItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
                    <div>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-sm text-gray-600 ml-2">
                        (Flagged by {item.flaggedBy})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={flatmates[item.assignedTo].color}>
                        {flatmates[item.assignedTo].name}'s turn
                      </Badge>
                      <Button 
                        size="sm" 
                        onClick={() => completeShopping(item.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Bought
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Flatmates Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Flatmate Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {flatmates.map((flatmate, index) => (
                  <div key={flatmate.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${flatmate.color}`}></div>
                      <span className="font-medium">{flatmate.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-800">
                        {flatmate.tasksCompleted}
                      </div>
                      <div className="text-sm text-gray-600">tasks completed</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Current Chores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Current Chores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {chores.map(chore => (
                  <div key={chore.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">{chore.name}</h3>
                      <Badge variant="secondary">{chore.frequency}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${flatmates[chore.currentTurn].color}`}></div>
                        <span className="text-sm font-medium">
                          {flatmates[chore.currentTurn].name}'s turn
                        </span>
                      </div>
                      
                      <Button 
                        size="sm" 
                        onClick={() => completeChore(chore.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Done
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Shopping Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Shopping Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {shoppingItems.map(item => (
                  <div key={item.id} className={`p-4 border rounded-lg transition-all ${
                    item.isLow ? 'border-red-200 bg-red-50' : 'hover:shadow-md'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{item.name}</h3>
                      {item.isLow && (
                        <Badge variant="destructive" className="text-xs">
                          Low Stock
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${flatmates[item.assignedTo].color}`}></div>
                        <span className="text-sm">
                          {flatmates[item.assignedTo].name}'s responsibility
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        {!item.isLow && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => flagItem(item.id, flatmates[0].name)}
                          >
                            Flag Low
                          </Button>
                        )}
                        {item.isLow && (
                          <Button 
                            size="sm" 
                            onClick={() => completeShopping(item.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Bought
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
