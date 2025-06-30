import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCommonTranslation, useShopTranslation, useLanguage } from "@/hooks/use-language";
import { getLocalizedField, type SupportedLanguage } from "@shared/localization";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatCurrency, formatQuantity, getUnitShortLabel, formatDeliveryTimeRange, type ProductUnit } from "@/lib/currency";
import { User, ShoppingCart, Clock, Package, CheckCircle, Plus, Edit, Trash2, MapPin, Lock, Shield, Camera, Upload } from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import type { OrderWithItems, UserAddress } from "@shared/schema";

export default function Profile() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { t } = useCommonTranslation();
  const { t: tShop } = useShopTranslation();
  const { currentLanguage } = useLanguage();
  const queryClient = useQueryClient();
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);
  const [addressForm, setAddressForm] = useState({
    label: "",
    address: "",
    isDefault: false
  });
  const [phoneForm, setPhoneForm] = useState({
    phone: user?.phone || ""
  });
  const [isPhoneEditing, setIsPhoneEditing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [avatarForm, setAvatarForm] = useState({
    profileImageUrl: user?.profileImageUrl || ""
  });
  const [nameForm, setNameForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || ""
  });
  const [isNameEditing, setIsNameEditing] = useState(false);

  // Update forms when user data changes
  useEffect(() => {
    if (user) {
      setNameForm({
        firstName: user.firstName || "",
        lastName: user.lastName || ""
      });
    }
  }, [user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: t('auth.unauthorized'),
        description: t('auth.loginRedirect'),
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: orders } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders/my"],
    enabled: !!user,
  });

  const { data: userAddresses = [] } = useQuery<UserAddress[]>({
    queryKey: ["/api/addresses"],
    enabled: !!user,
  });

  // Address mutations
  const createAddressMutation = useMutation({
    mutationFn: async (addressData: typeof addressForm) => {
      await apiRequest("POST", "/api/addresses", addressData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      setIsAddressDialogOpen(false);
      setAddressForm({ label: "", address: "", isDefault: false });
      toast({
        title: t('status.success'),
        description: t('profile.addressAdded'),
      });
    },
    onError: (error) => {
      toast({
        title: t('status.error'),
        description: t('profile.addressError'),
        variant: "destructive",
      });
    },
  });

  const updateAddressMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof addressForm }) => {
      await apiRequest("PATCH", `/api/addresses/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      setIsAddressDialogOpen(false);
      setEditingAddress(null);
      setAddressForm({ label: "", address: "", isDefault: false });
      toast({
        title: t("status.success"),
        description: t("profile.addressUpdated"),
      });
    },
    onError: (error) => {
      toast({
        title: t("status.error"),
        description: t("profile.addressUpdateError"),
        variant: "destructive",
      });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/addresses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      toast({
        title: t("status.success"),
        description: t("profile.addressDeleted"),
      });
    },
    onError: (error) => {
      toast({
        title: t("status.error"),
        description: t("profile.addressDeleteError"),
        variant: "destructive",
      });
    },
  });

  const setDefaultAddressMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/addresses/${id}/set-default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      toast({
        title: t("status.success"),
        description: t("profile.defaultAddressChanged"),
      });
    },
  });

  const updatePhoneMutation = useMutation({
    mutationFn: async (phone: string) => {
      await apiRequest("PATCH", "/api/profile", { phone });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsPhoneEditing(false);
      toast({
        title: t("status.success"),
        description: t("profile.phoneUpdated"),
      });
    },
    onError: (error) => {
      toast({
        title: t("status.error"),
        description: t("profile.phoneUpdateError"),
        variant: "destructive",
      });
    },
  });

  const updateAvatarMutation = useMutation({
    mutationFn: async (profileImageUrl: string) => {
      await apiRequest("PATCH", "/api/profile", { profileImageUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsAvatarDialogOpen(false);
      toast({
        title: t("status.success"),
        description: t("profile.avatarUpdated"),
      });
    },
    onError: (error) => {
      toast({
        title: t("status.error"),
        description: t("profile.avatarUpdateError"),
        variant: "destructive",
      });
    },
  });

  const updateNameMutation = useMutation({
    mutationFn: async (nameData: { firstName: string; lastName: string }) => {
      await apiRequest("PATCH", "/api/profile", nameData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsNameEditing(false);
      toast({
        title: t("status.success"),
        description: t("profile.nameUpdated"),
      });
    },
    onError: (error) => {
      toast({
        title: t("status.error"),
        description: t("profile.nameUpdateError"),
        variant: "destructive",
      });
    },
  });

  const handleEditAddress = (address: UserAddress) => {
    setEditingAddress(address);
    setAddressForm({
      label: address.label,
      address: address.address,
      isDefault: Boolean(address.isDefault),
    });
    setIsAddressDialogOpen(true);
  };

  const handleSaveAddress = () => {
    if (editingAddress) {
      updateAddressMutation.mutate({ id: editingAddress.id, data: addressForm });
    } else {
      createAddressMutation.mutate(addressForm);
    }
  };

  const handleViewOrderDetails = (order: OrderWithItems) => {
    setSelectedOrder(order);
    setIsOrderDetailsOpen(true);
  };

  const parseOrderDiscounts = (customerNotes: string) => {
    try {
      const discountMatch = customerNotes.match(/\[DISCOUNTS:(.*?)\]/);
      if (discountMatch) {
        return JSON.parse(discountMatch[1]);
      }
    } catch (error) {
      console.error('Error parsing discounts:', error);
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    const getStatusStyle = (status: string) => {
      switch (status) {
        case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'preparing': return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'ready': return 'bg-green-100 text-green-800 border-green-200';
        case 'delivered': return 'bg-gray-100 text-gray-800 border-gray-200';
        case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    const getStatusLabel = (status: string) => {
      switch (status) {
        case 'pending': return tShop('orderStatus.pending');
        case 'confirmed': return tShop('orderStatus.confirmed');
        case 'preparing': return tShop('orderStatus.preparing');
        case 'ready': return tShop('orderStatus.ready');
        case 'delivered': return tShop('orderStatus.delivered');
        case 'cancelled': return tShop('orderStatus.cancelled');
        default: return status;
      }
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(status)}`}>
        {getStatusLabel(status)}
      </span>
    );
  };

  const totalOrders = orders?.length || 0;
  const totalSpent = orders?.reduce((acc, order) => acc + parseFloat(order.totalAmount), 0) || 0;
  const activeOrders = orders?.filter(order => 
    ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status)
  ).length || 0;



  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-6xl mx-auto p-6 pt-20">
        <div className="mb-8">
          <h1 className="text-3xl font-poppins font-bold text-gray-900 mb-2">
            {t('profile.title')}
          </h1>
          <p className="text-gray-600">
            {t('profile.subtitle')}
          </p>
        </div>

        {/* Profile Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('profile.totalOrders')}</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                {activeOrders} {t('profile.active')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('profile.totalSpent')}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalSpent)}</div>
              <p className="text-xs text-muted-foreground">
                {t('profile.allTime')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('profile.status')}</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{t('profile.regularCustomer')}</div>
              <p className="text-xs text-muted-foreground">
                {t('profile.memberSince')} {new Date(user.createdAt || '').toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground w-fit">
            <TabsTrigger value="profile" className="whitespace-nowrap px-4 py-1.5 text-sm font-medium">{t('profile.profileTab')}</TabsTrigger>
            <TabsTrigger value="security" className="whitespace-nowrap px-4 py-1.5 text-sm font-medium">{t('profile.securityTab')}</TabsTrigger>
            <TabsTrigger value="addresses" className="whitespace-nowrap px-4 py-1.5 text-sm font-medium">{t('profile.addressesTab')}</TabsTrigger>
            <TabsTrigger value="orders" className="whitespace-nowrap px-4 py-1.5 text-sm font-medium">{t('profile.ordersTab')}</TabsTrigger>
          </TabsList>

          {/* Profile Information */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t('profile.profileInfo')}
                </CardTitle>
                <CardDescription>
                  {t('profile.profileInfoDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Avatar Section */}
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={user.profileImageUrl || ""} alt="Profile" />
                        <AvatarFallback className="text-lg">
                          {user.firstName ? user.firstName[0] : user.username[0]}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                        onClick={() => setIsAvatarDialogOpen(true)}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">{user.firstName || user.username}</div>
                      <div className="text-xs text-gray-500">{t('profile.clickToChangePhoto')}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('profile.fullName')}</label>
                      <div className="mt-1 flex items-center gap-2">
                        {isNameEditing ? (
                          <div className="space-y-3 w-full">
                            <div>
                              <Label className="text-xs text-gray-600">{t('profile.firstName')}</Label>
                              <Input
                                type="text"
                                placeholder={t('profile.enterFirstName')}
                                value={nameForm.firstName}
                                onChange={(e) => setNameForm({ ...nameForm, firstName: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600">{t('profile.lastName')}</Label>
                              <Input
                                type="text"
                                placeholder={t('profile.enterLastName')}
                                value={nameForm.lastName}
                                onChange={(e) => setNameForm({ ...nameForm, lastName: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                onClick={() => updateNameMutation.mutate(nameForm)}
                                disabled={updateNameMutation.isPending}
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                              >
                                {updateNameMutation.isPending ? t('status.saving') : t('actions.save')}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setIsNameEditing(false);
                                  setNameForm({
                                    firstName: user?.firstName || "",
                                    lastName: user?.lastName || ""
                                  });
                                }}
                              >
                                {t('actions.cancel')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-sm text-gray-900 flex-1">
                              {user.firstName || user.lastName 
                                ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                                : t('profile.notSpecified')
                              }
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setIsNameEditing(true)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Email</label>
                      <div className="mt-1 text-sm text-gray-900">{user.email}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('profile.phone')}</label>
                      <div className="mt-1">
                        {isPhoneEditing ? (
                          <div className="space-y-3">
                            <div>
                              <Label className="text-xs text-gray-600">{t('profile.phoneNumber')}</Label>
                              <Input
                                type="tel"
                                placeholder="+972-XX-XXX-XXXX"
                                value={phoneForm.phone}
                                onChange={(e) => setPhoneForm({ phone: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                onClick={() => updatePhoneMutation.mutate(phoneForm.phone)}
                                disabled={updatePhoneMutation.isPending}
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                              >
                                {updatePhoneMutation.isPending ? t('status.saving') : t('actions.save')}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setIsPhoneEditing(false);
                                  setPhoneForm({ phone: user?.phone || "" });
                                }}
                              >
                                {t('actions.cancel')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-900 flex-1">
                              {user.phone || t('profile.notSpecified')}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setPhoneForm({ phone: user?.phone || "" });
                                setIsPhoneEditing(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">{t('profile.registrationDate')}</label>
                      <div className="mt-1 text-sm text-gray-900">
                        {new Date(user.createdAt || '').toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">{t('profile.quickActions')}</h3>
                  <div className="flex gap-4">
                    <Button 
                      onClick={() => window.location.href = '/'}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                      style={{ backgroundColor: 'hsl(16, 100%, 60%)' }}
                    >
                      {t('navigation.goToMenu')}
                    </Button>
                    <Button variant="outline" onClick={() => window.location.href = '/api/logout'}>
                      {t('auth.logout')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {t('profile.accountSecurity')}
                </CardTitle>
                <CardDescription>
                  {t('profile.passwordSecurityManagement')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Password Management */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Lock className="h-5 w-5 text-blue-600" />
                      <div>
                        <h3 className="font-medium">{t('auth.password')}</h3>
                        <p className="text-sm text-gray-600">
                          {user.password 
                            ? t('profile.passwordSet') 
                            : t('profile.passwordNotSet')
                          }
                        </p>
                      </div>
                    </div>
                    <Link href="/change-password">
                      <Button variant="outline">
                        <Lock className="h-4 w-4 mr-2" />
                        {user.password ? t('auth.changePassword') : t('profile.setPassword')}
                      </Button>
                    </Link>
                  </div>

                  {/* Account Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">{t('profile.emailAddress')}</h4>
                      <p className="text-sm text-gray-600 mb-1">{user.email}</p>
                      <p className="text-xs text-gray-500">
                        {t('profile.emailUsageDescription')}
                      </p>
                    </div>
                    

                  </div>

                  {/* Security Tips */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">{t('profile.securityTips')}</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• {t('profile.securityTip1')}</li>
                      <li>• {t('profile.securityTip2')}</li>
                      <li>• {t('profile.securityTip3')}</li>
                      <li>• {t('profile.securityTip4')}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Address Management */}
          <TabsContent value="addresses" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {t('profile.addressManagement')}
                </CardTitle>
                <CardDescription>
                  {t('profile.manageDeliveryAddresses')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        onClick={() => {
                          setEditingAddress(null);
                          setAddressForm({ label: "", address: "", isDefault: false });
                        }}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t('profile.addAddress')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>
                          {editingAddress ? t('profile.editAddress') : t('profile.addNewAddress')}
                        </DialogTitle>
                        <DialogDescription>
                          {t('profile.enterAddressInfo')}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="label">{t('profile.addressLabel')}</Label>
                          <Input
                            id="label"
                            placeholder={t('profile.addressPlaceholder')}
                            value={addressForm.label}
                            onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="address">{t('profile.fullAddress')}</Label>
                          <Textarea
                            id="address"
                            placeholder={t('profile.fullAddressPlaceholder')}
                            value={addressForm.address}
                            onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                            className="min-h-[80px]"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="default"
                            checked={addressForm.isDefault}
                            onCheckedChange={(checked) => setAddressForm({ ...addressForm, isDefault: checked })}
                            className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300"
                          />
                          <Label htmlFor="default">{t('profile.makeDefaultAddress')}</Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddressDialogOpen(false)}>
                          {t('actions.cancel')}
                        </Button>
                        <Button 
                          onClick={handleSaveAddress}
                          disabled={!addressForm.label.trim() || !addressForm.address.trim()}
                          className="bg-orange-500 hover:bg-orange-600 text-white"
                        >
                          {editingAddress ? t('actions.save') : t('actions.add')}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {userAddresses.length > 0 ? (
                  <div className="space-y-4">
                    {userAddresses.map((address) => (
                      <Card key={address.id} className={`${address.isDefault ? 'border-orange-200 bg-orange-50' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium text-gray-900">{address.label}</h4>
                                {address.isDefault && (
                                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                                    {t('profile.default')}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{address.address}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              {!address.isDefault && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDefaultAddressMutation.mutate(address.id)}
                                  disabled={setDefaultAddressMutation.isPending}
                                >
                                  {t('profile.makeDefault')}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditAddress(address)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteAddressMutation.mutate(address.id)}
                                disabled={deleteAddressMutation.isPending}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('profile.noSavedAddresses')}</h3>
                    <p className="text-gray-600 mb-4">{t('profile.addAddressForQuickOrders')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Order History */}
          <TabsContent value="orders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  {t('profile.orderHistory')}
                </CardTitle>
                <CardDescription>
                  {t('profile.allOrdersAndStatuses')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orders && orders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('profile.order')}</TableHead>
                        <TableHead>{t('profile.date')}</TableHead>
                        <TableHead>{t('status.status')}</TableHead>
                        <TableHead>{t('profile.items')}</TableHead>
                        <TableHead>{t('profile.amount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">#{order.id}</TableCell>
                          <TableCell>
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString('ru-RU') : '—'}
                            <div className="text-xs text-gray-500">
                              {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('ru-RU', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              }) : '—'}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <button
                                onClick={() => handleViewOrderDetails(order)}
                                className="text-left hover:text-orange-600 transition-colors"
                              >
                                {order.items.slice(0, 2).map((item, index) => (
                                  <div key={index} className="text-sm">
                                    {getLocalizedField(item.product, 'name', currentLanguage as SupportedLanguage, 'ru' as SupportedLanguage)} ({formatQuantity(parseFloat(item.quantity), (item.product.unit || "100g") as ProductUnit, tShop)})
                                  </div>
                                ))}
                                {order.items.length > 2 && (
                                  <div className="text-xs text-gray-500">
                                    +{order.items.length - 2} {t('profile.more')}
                                  </div>
                                )}
                                <div className="text-xs text-orange-600 mt-1">
                                  {t('profile.details')} →
                                </div>
                              </button>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {(() => {
                              const discounts = parseOrderDiscounts(order.customerNotes || '');
                              const hasDiscounts = discounts && (discounts.orderDiscount || Object.keys(discounts.itemDiscounts || {}).length > 0);
                              
                              if (hasDiscounts) {
                                // Calculate original total without discounts
                                const originalSubtotal = order.items.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0);
                                const deliveryFee = parseFloat(order.deliveryFee);
                                const originalTotal = originalSubtotal + deliveryFee;
                                
                                return (
                                  <div className="flex flex-col items-end">
                                    <span className="text-xs text-gray-500 line-through">
                                      {formatCurrency(originalTotal)}
                                    </span>
                                    <span className="text-red-600 font-medium">
                                      {formatCurrency(parseFloat(order.totalAmount))}
                                    </span>
                                  </div>
                                );
                              }
                              
                              return formatCurrency(parseFloat(order.totalAmount));
                            })()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('profile.noOrders')}</h3>
                    <p className="text-gray-500 mb-4">{t('profile.noOrdersYet')}</p>
                    <Button 
                      onClick={() => window.location.href = '/'}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                      style={{ backgroundColor: 'hsl(16, 100%, 60%)' }}
                    >
                      {t('profile.startShopping')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Order Details Modal */}
        <Dialog open={isOrderDetailsOpen} onOpenChange={setIsOrderDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('profile.orderDetails')} #{selectedOrder?.id}</DialogTitle>
              <DialogDescription>
                {t('profile.orderFullInfo')} {selectedOrder?.createdAt ? new Date(selectedOrder.createdAt).toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : ''}
              </DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-6">
                {/* Order Status and Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{t('profile.orderInformation')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{t('profile.status')}:</span>
                        {getStatusBadge(selectedOrder.status)}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{t('profile.createdDate')}:</span>
                        <span className="text-sm">{selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleDateString('ru-RU') : '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{t('profile.paymentMethod')}:</span>
                        <span className="text-sm">{selectedOrder.paymentMethod === 'cash' ? t('profile.cash') : t('profile.card')}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{t('profile.delivery')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{t('profile.phone')}:</span>
                        <span className="text-sm">{selectedOrder.customerPhone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">{t('profile.address')}:</span>
                        <span className="text-sm max-w-48 text-right">{selectedOrder.deliveryAddress}</span>
                      </div>
                      {selectedOrder.deliveryDate && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">{t('profile.deliveryDate')}:</span>
                          <span className="text-sm">{new Date(selectedOrder.deliveryDate).toLocaleDateString('ru-RU')}</span>
                        </div>
                      )}
                      {selectedOrder.deliveryTime && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">{t('profile.deliveryTime')}:</span>
                          <span className="text-sm">{formatDeliveryTimeRange(selectedOrder.deliveryTime)}</span>
                        </div>
                      )}
                      {selectedOrder.paymentMethod && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">{t('profile.paymentMethod')}:</span>
                          <span className="text-sm">{selectedOrder.paymentMethod}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Order Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{t('profile.orderItems')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('profile.product')}</TableHead>
                          <TableHead>{t('profile.quantity')}</TableHead>
                          <TableHead>{t('profile.unitPrice')}</TableHead>
                          <TableHead>{t('profile.discount')}</TableHead>
                          <TableHead className="text-right">{t('profile.total')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.items.map((item, index) => {
                          const discounts = parseOrderDiscounts(selectedOrder.customerNotes || '');
                          const itemDiscount = discounts?.itemDiscounts?.[String(index + 1)];
                          const originalPrice = parseFloat(item.totalPrice);
                          let finalPrice = originalPrice;
                          
                          if (itemDiscount) {
                            if (itemDiscount.type === 'percentage') {
                              finalPrice = originalPrice * (1 - itemDiscount.value / 100);
                            } else if (itemDiscount.type === 'amount') {
                              finalPrice = Math.max(0, originalPrice - itemDiscount.value);
                            }
                          }

                          return (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{getLocalizedField(item.product, 'name', currentLanguage as SupportedLanguage, 'ru' as SupportedLanguage)}</div>
                                  <div className="text-sm text-gray-500">{getLocalizedField(item.product, 'description', currentLanguage as SupportedLanguage, 'ru' as SupportedLanguage)}</div>
                                </div>
                              </TableCell>
                              <TableCell dir="ltr">
                                {formatQuantity(parseFloat(item.quantity), (item.product.unit || "100g") as ProductUnit, tShop)}
                              </TableCell>
                              <TableCell>
                                {(() => {
                                  const unit = (item.product.unit || "100g") as ProductUnit;
                                  switch (unit) {
                                    case 'piece': return `${formatCurrency(item.product.price)} ${t('units.perPiece')}`;
                                    case 'kg': return `${formatCurrency(item.product.price)} ${t('units.perKg')}`;
                                    case '100g': return `${formatCurrency(item.product.price)} ${t('units.per100g')}`;
                                    case '100ml': return `${formatCurrency(item.product.price)} ${t('units.per100ml')}`;
                                    default: return formatCurrency(item.product.price);
                                  }
                                })()}
                              </TableCell>
                              <TableCell>
                                {itemDiscount ? (
                                  <span className="text-red-600">
                                    -{itemDiscount.type === 'percentage' ? `${itemDiscount.value}%` : formatCurrency(itemDiscount.value)}
                                  </span>
                                ) : '—'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex flex-col items-end">
                                  {itemDiscount && (
                                    <span className="text-xs text-gray-500 line-through">
                                      {formatCurrency(originalPrice)}
                                    </span>
                                  )}
                                  <span className={itemDiscount ? 'text-red-600 font-medium' : ''}>
                                    {formatCurrency(finalPrice)}
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Order Total */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      {(() => {
                        const discounts = parseOrderDiscounts(selectedOrder.customerNotes || '');
                        const subtotal = selectedOrder.items.reduce((sum, item, index) => {
                          let itemPrice = parseFloat(item.totalPrice);
                          const itemDiscount = discounts?.itemDiscounts?.[String(index + 1)];
                          
                          if (itemDiscount) {
                            if (itemDiscount.type === 'percentage') {
                              itemPrice = itemPrice * (1 - itemDiscount.value / 100);
                            } else if (itemDiscount.type === 'amount') {
                              itemPrice = Math.max(0, itemPrice - itemDiscount.value);
                            }
                          }
                          return sum + itemPrice;
                        }, 0);
                        
                        const deliveryFee = parseFloat(selectedOrder.deliveryFee);
                        const orderDiscount = discounts?.orderDiscount;
                        let finalSubtotal = subtotal;
                        
                        if (orderDiscount) {
                          if (orderDiscount.type === 'percentage') {
                            finalSubtotal = subtotal * (1 - orderDiscount.value / 100);
                          } else if (orderDiscount.type === 'amount') {
                            finalSubtotal = Math.max(0, subtotal - orderDiscount.value);
                          }
                        }

                        return (
                          <>
                            <div className="flex justify-between">
                              <span>{t('profile.subtotal')}:</span>
                              <span>{formatCurrency(subtotal)}</span>
                            </div>
                            {orderDiscount && (
                              <div className="flex justify-between text-red-600">
                                <span>{t('profile.orderDiscount')}:</span>
                                <span>
                                  -{orderDiscount.type === 'percentage' ? `${orderDiscount.value}%` : formatCurrency(orderDiscount.value)}
                                  {orderDiscount.type === 'percentage' && ` (${formatCurrency(subtotal - finalSubtotal)})`}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span>{t('profile.delivery')}:</span>
                              <span>{formatCurrency(deliveryFee)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold border-t pt-2">
                              <span>{t('profile.total')}:</span>
                              <span>{formatCurrency(parseFloat(selectedOrder.totalAmount))}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </CardContent>
                </Card>

                {/* Customer Notes */}
                {selectedOrder.customerNotes && !selectedOrder.customerNotes.includes('[DISCOUNTS:') && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">{t('profile.orderComments')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{selectedOrder.customerNotes}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Avatar Upload Dialog */}
        <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Изменить фото профиля</DialogTitle>
              <DialogDescription>
                Загрузите новое фото профиля
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="flex justify-center">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarForm.profileImageUrl || user.profileImageUrl || ""} alt="Preview" />
                  <AvatarFallback className="text-lg">
                    {user.firstName ? user.firstName[0] : user.username[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div>
                <Label htmlFor="avatar-upload">Фото профиля</Label>
                <ImageUpload
                  value={avatarForm.profileImageUrl}
                  onChange={(url) => setAvatarForm({ profileImageUrl: url })}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAvatarDialogOpen(false);
                  setAvatarForm({ profileImageUrl: user.profileImageUrl || "" });
                }}
              >
                Отмена
              </Button>
              <Button
                onClick={() => updateAvatarMutation.mutate(avatarForm.profileImageUrl)}
                disabled={updateAvatarMutation.isPending}
              >
                {updateAvatarMutation.isPending ? "Сохранение..." : "Сохранить"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}