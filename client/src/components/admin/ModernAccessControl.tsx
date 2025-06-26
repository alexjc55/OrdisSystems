import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Shield, 
  Users, 
  Key, 
  Settings, 
  UserCheck, 
  UserX, 
  Edit, 
  Trash2, 
  Plus, 
  Eye, 
  EyeOff,
  Lock,
  Unlock,
  Crown,
  User,
  Briefcase,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Package
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/hooks/use-toast';

// Permission definitions
const PERMISSIONS = {
  // Product Management
  'products.view': 'View Products',
  'products.create': 'Create Products',
  'products.edit': 'Edit Products',
  'products.delete': 'Delete Products',
  'products.manage_categories': 'Manage Categories',
  
  // Order Management
  'orders.view': 'View Orders',
  'orders.edit': 'Edit Orders',
  'orders.cancel': 'Cancel Orders',
  'orders.fulfill': 'Fulfill Orders',
  'orders.view_all': 'View All Orders',
  
  // User Management
  'users.view': 'View Users',
  'users.create': 'Create Users',
  'users.edit': 'Edit Users',
  'users.delete': 'Delete Users',
  'users.manage_roles': 'Manage User Roles',
  
  // Settings
  'settings.view': 'View Settings',
  'settings.edit': 'Edit Settings',
  'settings.system': 'System Settings',
  
  // Reports & Analytics
  'reports.view': 'View Reports',
  'reports.export': 'Export Reports',
  
  // System
  'system.maintenance': 'System Maintenance',
  'system.logs': 'View System Logs',
};

// Role definitions
const ROLES = {
  admin: {
    name: 'Administrator',
    description: 'Full system access',
    permissions: Object.keys(PERMISSIONS),
    color: 'bg-red-100 text-red-800',
    icon: Crown,
  },
  worker: {
    name: 'Worker',
    description: 'Order and product management',
    permissions: [
      'products.view', 'products.create', 'products.edit',
      'orders.view', 'orders.edit', 'orders.fulfill',
      'users.view', 'settings.view'
    ],
    color: 'bg-blue-100 text-blue-800',
    icon: Briefcase,
  },
  viewer: {
    name: 'Viewer',
    description: 'Read-only access',
    permissions: [
      'products.view', 'orders.view', 'users.view', 'settings.view', 'reports.view'
    ],
    color: 'bg-gray-100 text-gray-800',
    icon: Eye,
  },
};

const accessControlSchema = z.object({
  // Worker Access Settings
  workerCanViewAllOrders: z.boolean().default(false),
  workerCanEditOrders: z.boolean().default(true),
  workerCanCancelOrders: z.boolean().default(false),
  workerCanManageProducts: z.boolean().default(true),
  workerCanManageCategories: z.boolean().default(false),
  workerCanViewUsers: z.boolean().default(false),
  workerCanViewReports: z.boolean().default(false),
  
  // Security Settings
  sessionTimeout: z.number().min(5).max(1440).default(60), // minutes
  requirePasswordChange: z.boolean().default(false),
  minPasswordLength: z.number().min(6).max(50).default(8),
  allowMultipleSessions: z.boolean().default(true),
  
  // System Settings
  enableMaintenanceMode: z.boolean().default(false),
  maintenanceMessage: z.string().optional(),
  allowRegistration: z.boolean().default(false),
  requireEmailVerification: z.boolean().default(false),
});

type AccessControlFormData = z.infer<typeof accessControlSchema>;

interface ModernAccessControlProps {
  accessSettings: any;
  users: any[];
  onUpdateAccess: (data: AccessControlFormData) => void;
  onUpdateUserRole: (userId: string, role: string) => void;
  onDeleteUser: (userId: string) => void;
  isLoading: boolean;
}

interface UserManagementProps {
  users: any[];
  onUpdateUserRole: (userId: string, role: string) => void;
  onDeleteUser: (userId: string) => void;
  adminT: (key: string, fallback?: string) => string;
  isRTL: boolean;
}

function UserManagement({ users, onUpdateUserRole, onDeleteUser, adminT, isRTL }: UserManagementProps) {
  const [editingUser, setEditingUser] = useState<string | null>(null);
  
  const getRoleInfo = (role: string) => {
    return ROLES[role as keyof typeof ROLES] || {
      name: role,
      description: 'Custom role',
      color: 'bg-gray-100 text-gray-800',
      icon: User,
    };
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {adminT('accessControl.userManagement', 'User Management')}
        </CardTitle>
        <CardDescription>
          {adminT('accessControl.userManagementDesc', 'Manage user accounts and their roles')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{adminT('accessControl.user', 'User')}</TableHead>
                <TableHead>{adminT('accessControl.role', 'Role')}</TableHead>
                <TableHead>{adminT('accessControl.status', 'Status')}</TableHead>
                <TableHead>{adminT('accessControl.lastLogin', 'Last Login')}</TableHead>
                <TableHead className="text-right">{adminT('common.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const roleInfo = getRoleInfo(user.role);
                const IconComponent = roleInfo.icon;
                
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium">{user.username}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingUser === user.id ? (
                        <Select
                          value={user.role}
                          onValueChange={(value) => {
                            onUpdateUserRole(user.id, value);
                            setEditingUser(null);
                          }}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROLES).map(([key, role]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  <role.icon className="h-4 w-4" />
                                  {role.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={roleInfo.color}>
                          <IconComponent className="h-3 w-3 mr-1" />
                          {roleInfo.name}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'default' : 'secondary'}>
                        {user.isActive ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {adminT('accessControl.active', 'Active')}
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {adminT('accessControl.inactive', 'Inactive')}
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : adminT('common.never', 'Never')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingUser(editingUser === user.id ? null : user.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        {user.role !== 'admin' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {adminT('accessControl.deleteUser', 'Delete User')}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {adminT('accessControl.deleteUserConfirm', 'Are you sure you want to delete this user? This action cannot be undone.')}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  {adminT('common.cancel', 'Cancel')}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => onDeleteUser(user.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  {adminT('common.delete', 'Delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ModernAccessControl({ 
  accessSettings, 
  users, 
  onUpdateAccess, 
  onUpdateUserRole, 
  onDeleteUser, 
  isLoading 
}: ModernAccessControlProps) {
  const { t: adminT } = useTranslation('admin');
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'he';
  
  const [activeTab, setActiveTab] = useState('permissions');
  
  const form = useForm<AccessControlFormData>({
    resolver: zodResolver(accessControlSchema),
    defaultValues: {
      workerCanViewAllOrders: accessSettings?.workerCanViewAllOrders ?? false,
      workerCanEditOrders: accessSettings?.workerCanEditOrders ?? true,
      workerCanCancelOrders: accessSettings?.workerCanCancelOrders ?? false,
      workerCanManageProducts: accessSettings?.workerCanManageProducts ?? true,
      workerCanManageCategories: accessSettings?.workerCanManageCategories ?? false,
      workerCanViewUsers: accessSettings?.workerCanViewUsers ?? false,
      workerCanViewReports: accessSettings?.workerCanViewReports ?? false,
      sessionTimeout: accessSettings?.sessionTimeout ?? 60,
      requirePasswordChange: accessSettings?.requirePasswordChange ?? false,
      minPasswordLength: accessSettings?.minPasswordLength ?? 8,
      allowMultipleSessions: accessSettings?.allowMultipleSessions ?? true,
      enableMaintenanceMode: accessSettings?.enableMaintenanceMode ?? false,
      maintenanceMessage: accessSettings?.maintenanceMessage ?? '',
      allowRegistration: accessSettings?.allowRegistration ?? false,
      requireEmailVerification: accessSettings?.requireEmailVerification ?? false,
    },
  });
  
  const handleSubmit = (data: AccessControlFormData) => {
    onUpdateAccess(data);
    toast({
      title: adminT('common.success', 'Success'),
      description: adminT('accessControl.settingsSaved', 'Access control settings saved successfully'),
    });
  };
  
  const tabs = [
    {
      id: 'permissions',
      label: adminT('accessControl.tabs.permissions', 'Permissions'),
      icon: Shield,
    },
    {
      id: 'users',
      label: adminT('accessControl.tabs.users', 'Users'),
      icon: Users,
    },
    {
      id: 'security',
      label: adminT('accessControl.tabs.security', 'Security'),
      icon: Lock,
    },
    {
      id: 'system',
      label: adminT('accessControl.tabs.system', 'System'),
      icon: Settings,
    },
  ];
  
  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-orange-500" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {adminT('accessControl.title', 'Access Control')}
          </h2>
          <p className="text-gray-600">
            {adminT('accessControl.description', 'Manage user permissions and system security')}
          </p>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          {tabs.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id}
              className="flex items-center gap-2 text-sm"
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            
            {/* Permissions Tab */}
            <TabsContent value="permissions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    {adminT('accessControl.workerPermissions', 'Worker Permissions')}
                  </CardTitle>
                  <CardDescription>
                    {adminT('accessControl.workerPermissionsDesc', 'Configure what workers can access and modify')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Order Management Permissions */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {adminT('accessControl.orderManagement', 'Order Management')}
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="workerCanViewAllOrders"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-medium">
                                {adminT('accessControl.viewAllOrders', 'View All Orders')}
                              </FormLabel>
                              <FormDescription>
                                {adminT('accessControl.viewAllOrdersDesc', 'Allow workers to see orders from all customers')}
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="workerCanEditOrders"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-medium">
                                {adminT('accessControl.editOrders', 'Edit Orders')}
                              </FormLabel>
                              <FormDescription>
                                {adminT('accessControl.editOrdersDesc', 'Allow workers to modify order details')}
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="workerCanCancelOrders"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-medium">
                                {adminT('accessControl.cancelOrders', 'Cancel Orders')}
                              </FormLabel>
                              <FormDescription>
                                {adminT('accessControl.cancelOrdersDesc', 'Allow workers to cancel customer orders')}
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Product Management Permissions */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {adminT('accessControl.productManagement', 'Product Management')}
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="workerCanManageProducts"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-medium">
                                {adminT('accessControl.manageProducts', 'Manage Products')}
                              </FormLabel>
                              <FormDescription>
                                {adminT('accessControl.manageProductsDesc', 'Allow workers to add, edit, and delete products')}
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="workerCanManageCategories"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-medium">
                                {adminT('accessControl.manageCategories', 'Manage Categories')}
                              </FormLabel>
                              <FormDescription>
                                {adminT('accessControl.manageCategoriesDesc', 'Allow workers to add, edit, and delete categories')}
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* System Access Permissions */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      {adminT('accessControl.systemAccess', 'System Access')}
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="workerCanViewUsers"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-medium">
                                {adminT('accessControl.viewUsers', 'View Users')}
                              </FormLabel>
                              <FormDescription>
                                {adminT('accessControl.viewUsersDesc', 'Allow workers to see user list')}
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="workerCanViewReports"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base font-medium">
                                {adminT('accessControl.viewReports', 'View Reports')}
                              </FormLabel>
                              <FormDescription>
                                {adminT('accessControl.viewReportsDesc', 'Allow workers to access sales reports')}
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Roles Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {adminT('accessControl.rolesOverview', 'Roles Overview')}
                  </CardTitle>
                  <CardDescription>
                    {adminT('accessControl.rolesOverviewDesc', 'Default permission sets for different user roles')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(ROLES).map(([key, role]) => {
                      const IconComponent = role.icon;
                      return (
                        <div key={key} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${role.color}`}>
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="font-medium">{role.name}</h4>
                              <p className="text-sm text-gray-500">{role.description}</p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-700">
                              {adminT('accessControl.permissions', 'Permissions')}:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {role.permissions.slice(0, 3).map((permission) => (
                                <Badge key={permission} variant="outline" className="text-xs">
                                  {PERMISSIONS[permission as keyof typeof PERMISSIONS] || permission}
                                </Badge>
                              ))}
                              {role.permissions.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{role.permissions.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <UserManagement
                users={users}
                onUpdateUserRole={onUpdateUserRole}
                onDeleteUser={onDeleteUser}
                adminT={adminT}
                isRTL={isRTL}
              />
            </TabsContent>
            
            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    {adminT('accessControl.sessionSecurity', 'Session Security')}
                  </CardTitle>
                  <CardDescription>
                    {adminT('accessControl.sessionSecurityDesc', 'Configure user session and authentication settings')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="sessionTimeout"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4" />
                            {adminT('accessControl.sessionTimeout', 'Session Timeout (minutes)')}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="5" 
                              max="1440"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                            />
                          </FormControl>
                          <FormDescription>
                            {adminT('accessControl.sessionTimeoutDesc', 'Automatically log out users after inactivity')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="minPasswordLength"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Key className="h-4 w-4" />
                            {adminT('accessControl.minPasswordLength', 'Minimum Password Length')}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="6" 
                              max="50"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 8)}
                            />
                          </FormControl>
                          <FormDescription>
                            {adminT('accessControl.minPasswordLengthDesc', 'Minimum required password length for new accounts')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="requirePasswordChange"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-medium">
                              {adminT('accessControl.requirePasswordChange', 'Require Password Change')}
                            </FormLabel>
                            <FormDescription>
                              {adminT('accessControl.requirePasswordChangeDesc', 'Force users to change password on first login')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="allowMultipleSessions"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-medium">
                              {adminT('accessControl.allowMultipleSessions', 'Allow Multiple Sessions')}
                            </FormLabel>
                            <FormDescription>
                              {adminT('accessControl.allowMultipleSessionsDesc', 'Allow users to be logged in from multiple devices')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    {adminT('accessControl.registrationSettings', 'Registration Settings')}
                  </CardTitle>
                  <CardDescription>
                    {adminT('accessControl.registrationSettingsDesc', 'Control how new users can register')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="allowRegistration"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-medium">
                              {adminT('accessControl.allowRegistration', 'Allow Public Registration')}
                            </FormLabel>
                            <FormDescription>
                              {adminT('accessControl.allowRegistrationDesc', 'Enable public user registration')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="requireEmailVerification"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base font-medium">
                              {adminT('accessControl.requireEmailVerification', 'Require Email Verification')}
                            </FormLabel>
                            <FormDescription>
                              {adminT('accessControl.requireEmailVerificationDesc', 'Users must verify email before accessing system')}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* System Tab */}
            <TabsContent value="system" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    {adminT('accessControl.systemMaintenance', 'System Maintenance')}
                  </CardTitle>
                  <CardDescription>
                    {adminT('accessControl.systemMaintenanceDesc', 'System-wide settings and maintenance mode')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="enableMaintenanceMode"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-medium">
                            {adminT('accessControl.maintenanceMode', 'Maintenance Mode')}
                          </FormLabel>
                          <FormDescription>
                            {adminT('accessControl.maintenanceModeDesc', 'Temporarily disable public access to the system')}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch("enableMaintenanceMode") && (
                    <FormField
                      control={form.control}
                      name="maintenanceMessage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{adminT('accessControl.maintenanceMessage', 'Maintenance Message')}</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              rows={3}
                              placeholder={adminT('accessControl.maintenanceMessagePlaceholder', 'We are currently performing maintenance. Please try again later.')}
                            />
                          </FormControl>
                          <FormDescription>
                            {adminT('accessControl.maintenanceMessageDesc', 'Message shown to users during maintenance')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <Separator />
            
            <div className="flex items-center justify-between pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => form.reset()}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {adminT('common.reset', 'Reset')}
              </Button>
              
              <Button type="submit" disabled={isLoading} className="min-w-[120px]">
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {adminT('common.save', 'Save Settings')}
              </Button>
            </div>
          </form>
        </Form>
      </Tabs>
    </div>
  );
}