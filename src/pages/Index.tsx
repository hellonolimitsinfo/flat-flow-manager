import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, AlertTriangle, RotateCcw, Users, Calendar, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { useForm } from "react-hook-form";

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

interface ChoreFormValues {
  name: string;
  frequency: string;
}

interface ShoppingItemFormValues {
  name: string;
}

const Index = () => {
  const { toast } = useToast();
  const choreForm = useForm<ChoreFormValues>({
    defaultValues: {
      name: "",
      frequency: "Weekly"
    }
  });
  
  const shoppingForm = useForm<ShoppingItemFormValues>({
    defaultValues: {
      name: ""
    }
  });
  
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

  // Set dark theme on component mount
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

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

  const addNewChore = (values: ChoreFormValues) => {
    const newChore: Chore = {
      id: `${chores.length + 1}`,
      name: values.name,
      currentTurn: 0, // Start with the first flatmate
      frequency: values.frequency
    };
    
    setChores(prev => [...prev, newChore]);
    
    toast({
      title: "New chore added! ✨",
      description: `${values.name} has been added to the chore list.`,
    });
    
    form.reset();
  };

  const addNewShoppingItem = (values: ShoppingItemFormValues) => {
    const newItem: ShoppingItem = {
      id: `${shoppingItems.length + 1}`,
      name: values.name,
      isLow: false,
      assignedTo: 0 // Start with the first flatmate
    };
    
    setShoppingItems(prev => [...prev, newItem]);
    
    toast({
      title: "New shopping item added! 🛒",
      description: `${values.name} has been added to the shopping list.`,
    });
    
    shoppingForm.reset();
  };

  const urgentItems = shoppingItems.filter(item => item.isLow);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-100 mb-2">
            🏠 Flatmate Flow
          </h1>
          <p className="text-lg text-gray-300">
            Keep track of chores, shopping, and responsibilities
          </p>
        </div>

        {/* Urgent Alerts */}
        {urgentItems.length > 0 && (
          <Card className="mb-8 border-amber-800 bg-amber-900/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                Urgent Items Needed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {urgentItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-800/60 rounded-lg border border-amber-800/50">
                    <div>
                      <span className="font-medium text-gray-200">{item.name}</span>
                      <span className="text-sm text-gray-400 ml-2">
                        (Flagged by {item.flaggedBy})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={`${flatmates[item.assignedTo].color} text-gray-100`}>
                        {flatmates[item.assignedTo].name}'s turn
                      </Badge>
                      <Button 
                        size="sm" 
                        onClick={() => completeShopping(item.id)}
                        className="bg-green-700 hover:bg-green-800"
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
          <Card className="bg-gray-800/80 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-100">
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
                      <span className="font-medium text-gray-200">{flatmate.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-100">
                        {flatmate.tasksCompleted}
                      </div>
                      <div className="text-sm text-gray-400">tasks completed</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Current Chores */}
          <Card className="bg-gray-800/80 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-gray-100">
                <Calendar className="h-5 w-5" />
                Current Chores
              </CardTitle>
              <Sheet>
                <SheetTrigger asChild>
                  <Button size="sm" className="h-8 bg-gray-700 hover:bg-gray-600">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Chore
                  </Button>
                </SheetTrigger>
                <SheetContent className="bg-gray-800 border-gray-700">
                  <SheetHeader>
                    <SheetTitle className="text-gray-100">Add New Chore</SheetTitle>
                    <SheetDescription className="text-gray-400">
                      Add a new chore to the rotation list. Once added, the chore will be assigned starting with Alex.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="py-6">
                    <Form {...choreForm}>
                      <form onSubmit={choreForm.handleSubmit(addNewChore)} className="space-y-6">
                        <FormItem>
                          <FormLabel className="text-gray-200">Chore Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g. Mop the floors" 
                              {...choreForm.register("name")}
                              required
                              className="bg-gray-700 border-gray-600 text-gray-100"
                            />
                          </FormControl>
                        </FormItem>
                        <FormItem>
                          <FormLabel className="text-gray-200">Frequency</FormLabel>
                          <FormControl>
                            <select 
                              className="w-full p-2 border rounded-md bg-gray-700 border-gray-600 text-gray-100"
                              {...choreForm.register("frequency")}
                            >
                              <option value="Daily">Daily</option>
                              <option value="Weekly">Weekly</option>
                              <option value="Bi-weekly">Bi-weekly</option>
                              <option value="Monthly">Monthly</option>
                            </select>
                          </FormControl>
                        </FormItem>
                        <SheetFooter>
                          <SheetClose asChild>
                            <Button type="button" variant="outline" className="border-gray-600 text-gray-300">Cancel</Button>
                          </SheetClose>
                          <Button type="submit" className="bg-blue-700 hover:bg-blue-800">Add Chore</Button>
                        </SheetFooter>
                      </form>
                    </Form>
                  </div>
                </SheetContent>
              </Sheet>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {chores.map(chore => (
                  <div key={chore.id} className="p-4 border rounded-lg border-gray-700 bg-gray-800/50 hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-200">{chore.name}</h3>
                      <Badge variant="secondary" className="bg-gray-700 text-gray-300">{chore.frequency}</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${flatmates[chore.currentTurn].color}`}></div>
                        <span className="text-sm font-medium text-gray-300">
                          {flatmates[chore.currentTurn].name}'s turn
                        </span>
                      </div>
                      
                      <Button 
                        size="sm" 
                        onClick={() => completeChore(chore.id)}
                        className="bg-blue-700 hover:bg-blue-800"
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
          <Card className="bg-gray-800/80 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-gray-100">
                <RotateCcw className="h-5 w-5" />
                Shopping Items
              </CardTitle>
              <Sheet>
                <SheetTrigger asChild>
                  <Button size="sm" className="h-8 bg-gray-700 hover:bg-gray-600">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </SheetTrigger>
                <SheetContent className="bg-gray-800 border-gray-700">
                  <SheetHeader>
                    <SheetTitle className="text-gray-100">Add Shopping Item</SheetTitle>
                    <SheetDescription className="text-gray-400">
                      Add a new item to the shopping list. Once added, the item will be assigned to the first flatmate.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="py-6">
                    <Form {...shoppingForm}>
                      <form onSubmit={shoppingForm.handleSubmit(addNewShoppingItem)} className="space-y-6">
                        <FormItem>
                          <FormLabel className="text-gray-200">Item Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g. Paper Towels" 
                              {...shoppingForm.register("name")}
                              required
                              className="bg-gray-700 border-gray-600 text-gray-100"
                            />
                          </FormControl>
                        </FormItem>
                        <SheetFooter>
                          <SheetClose asChild>
                            <Button type="button" variant="outline" className="border-gray-600 text-gray-300">Cancel</Button>
                          </SheetClose>
                          <Button type="submit" className="bg-blue-700 hover:bg-blue-800">Add Item</Button>
                        </SheetFooter>
                      </form>
                    </Form>
                  </div>
                </SheetContent>
              </Sheet>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {shoppingItems.map(item => (
                  <div key={item.id} className={`p-4 border rounded-lg transition-all ${
                    item.isLow ? 'border-red-800 bg-red-900/30' : 'border-gray-700 bg-gray-800/50 hover:bg-gray-700/50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-200">{item.name}</h3>
                      {item.isLow && (
                        <Badge variant="destructive" className="text-xs">
                          Low Stock
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${flatmates[item.assignedTo].color}`}></div>
                        <span className="text-sm text-gray-300">
                          {flatmates[item.assignedTo].name}'s responsibility
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        {!item.isLow && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => flagItem(item.id, flatmates[0].name)}
                            className="border-gray-600 text-gray-300 hover:bg-gray-700"
                          >
                            Flag Low
                          </Button>
                        )}
                        {item.isLow && (
                          <Button 
                            size="sm" 
                            onClick={() => completeShopping(item.id)}
                            className="bg-green-700 hover:bg-green-800"
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
