import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PricingRule {
  id: string;
  service_type_id: string;
  base_fare_multiplier: number;
  distance_cost_per_km: number;
  peak_hours_multiplier: number | null;
  peak_hours_start: string | null;
  peak_hours_end: string | null;
  rayon_base_surcharge: number;
  description: string | null;
  active: boolean;
  effective_date: string;
  created_at: string;
  updated_at: string;
}

interface ServiceType {
  id: string;
  name: string;
}

interface FormData {
  service_id: string;
  base_multiplier: number;
  distance_cost_per_km: number;
  peak_multiplier: number;
  peak_hours_start: string;
  peak_hours_end: string;
  rayon_base_surcharge: number;
  description: string;
}

export default function PricingRulesTab() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<PricingRule | null>(null);
  const [formData, setFormData] = useState<FormData>({
    service_id: '',
    base_multiplier: 1.0,
    distance_cost_per_km: 2000,
    peak_multiplier: 1.0,
    peak_hours_start: '',
    peak_hours_end: '',
    rayon_base_surcharge: 0,
    description: '',
  });
  const queryClient = useQueryClient();

  // Query service types
  const { data: serviceTypes = [] } = useQuery({
    queryKey: ['admin-service-types-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shuttle_service_types')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Query pricing rules
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['admin-pricing-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shuttle_pricing_rules')
        .select('*')
        .order('created_at');
      if (error) throw error;
      return data || [];
    },
  });

  // Add rule mutation
  const addMutation = useMutation({
    mutationFn: async (newRule: Omit<PricingRule, 'id' | 'created_at' | 'updated_at' | 'effective_date'>) => {
      const { error } = await supabase
        .from('shuttle_pricing_rules')
        .insert([newRule]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pricing-rules'] });
      toast.success('Pricing rule added');
      setFormData({
        service_id: '',
        base_multiplier: 1.0,
        distance_cost_per_km: 2000,
        peak_multiplier: 1.0,
        peak_hours_start: '',
        peak_hours_end: '',
        rayon_base_surcharge: 0,
        description: '',
      });
      setIsAddOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add pricing rule');
    },
  });

  // Update rule mutation
  const updateMutation = useMutation({
    mutationFn: async (updated: Partial<PricingRule>) => {
      const { error } = await supabase
        .from('shuttle_pricing_rules')
        .update(updated)
        .eq('id', selectedRule?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pricing-rules'] });
      toast.success('Pricing rule updated');
      setIsEditOpen(false);
      setSelectedRule(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update pricing rule');
    },
  });

  // Delete rule mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shuttle_pricing_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pricing-rules'] });
      toast.success('Pricing rule deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete pricing rule');
    },
  });

  const handleAddSubmit = () => {
    if (!formData.service_id) {
      toast.error('Please select a service type');
      return;
    }

    addMutation.mutate({
      service_type_id: formData.service_id,
      base_fare_multiplier: formData.base_multiplier,
      distance_cost_per_km: formData.distance_cost_per_km,
      peak_hours_multiplier: formData.peak_multiplier,
      peak_hours_start: formData.peak_hours_start || null,
      peak_hours_end: formData.peak_hours_end || null,
      rayon_base_surcharge: formData.rayon_base_surcharge,
      description: formData.description || null,
      active: true,
    });
  };

  const handleEditSubmit = () => {
    if (!selectedRule) return;

    updateMutation.mutate({
      service_type_id: formData.service_id,
      base_fare_multiplier: formData.base_multiplier,
      distance_cost_per_km: formData.distance_cost_per_km,
      peak_hours_multiplier: formData.peak_multiplier,
      peak_hours_start: formData.peak_hours_start || null,
      peak_hours_end: formData.peak_hours_end || null,
      rayon_base_surcharge: formData.rayon_base_surcharge,
      description: formData.description || null,
    });
  };

  const handleEdit = (rule: PricingRule) => {
    setSelectedRule(rule);
    setFormData({
      service_id: rule.service_type_id,
      base_multiplier: rule.base_fare_multiplier,
      distance_cost_per_km: rule.distance_cost_per_km,
      peak_multiplier: rule.peak_hours_multiplier || 1.0,
      peak_hours_start: rule.peak_hours_start || '',
      peak_hours_end: rule.peak_hours_end || '',
      rayon_base_surcharge: rule.rayon_base_surcharge,
      description: rule.description || '',
    });
    setIsEditOpen(true);
  };

  const getServiceName = (serviceId: string) => {
    return serviceTypes.find((s: ServiceType) => s.id === serviceId)?.name || 'Unknown';
  };

  const formatPrice = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '0';
    return amount.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pricing Rules</CardTitle>
          <CardDescription>
            Configure pricing multipliers, distance costs, peak hours, and rayon surcharges for each service type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Base Multiplier:</strong> Multiplier applied to route base fare
            </p>
            <p>
              <strong>Cost Per Km:</strong> Cost charged per kilometer of distance
            </p>
            <p>
              <strong>Peak Hours:</strong> Multiplier applied during peak hours
            </p>
            <p>
              <strong>Rayon Surcharge:</strong> Base surcharge amount per rayon zone
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Add Button */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Pricing Rule
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Pricing Rule</DialogTitle>
            <DialogDescription>
              Create pricing for a service type
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Service Type Select */}
            <div>
              <label className="text-sm font-medium">Service Type *</label>
              <select
                value={formData.service_id}
                onChange={(e) =>
                  setFormData({ ...formData, service_id: e.target.value })
                }
                className="w-full border rounded-md p-2 mt-1 bg-background"
              >
                <option value="">Select Service Type</option>
                {serviceTypes.map((st: ServiceType) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Base Multiplier */}
            <div>
              <label className="text-sm font-medium">
                Base Fare Multiplier *
              </label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={formData.base_multiplier}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    base_multiplier: parseFloat(e.target.value) || 1.0,
                  })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                E.g., 1.0x for regular, 1.2x for premium
              </p>
            </div>

            {/* Cost Per KM */}
            <div>
              <label className="text-sm font-medium">Cost Per Km (Rp) *</label>
              <Input
                type="number"
                step="100"
                min="0"
                value={formData.distance_cost_per_km}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    distance_cost_per_km: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Charge per kilometer traveled
              </p>
            </div>

            {/* Peak Multiplier */}
            <div>
              <label className="text-sm font-medium">
                Peak Hours Multiplier *
              </label>
              <Input
                type="number"
                step="0.1"
                min="1.0"
                value={formData.peak_multiplier}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    peak_multiplier: parseFloat(e.target.value) || 1.0,
                  })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                E.g., 1.2x during peak hours
              </p>
            </div>

            {/* Rayon Surcharge */}
            <div>
              <label className="text-sm font-medium">
                Base Rayon Surcharge (Rp) *
              </label>
              <Input
                type="number"
                step="1000"
                min="0"
                value={formData.rayon_base_surcharge}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    rayon_base_surcharge: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Surcharge per rayon zone
              </p>
            </div>

            <Button
              onClick={handleAddSubmit}
              disabled={addMutation.isPending}
              className="w-full"
            >
              {addMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Rule'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Base Multiplier</TableHead>
                  <TableHead>Cost/Km</TableHead>
                  <TableHead>Peak Multiplier</TableHead>
                  <TableHead>Rayon Surcharge</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule: PricingRule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">
                      {getServiceName(rule.service_type_id)}
                    </TableCell>
                    <TableCell>{(rule.base_fare_multiplier ?? 1).toFixed(1)}x</TableCell>
                    <TableCell>
                      Rp {formatPrice(rule.distance_cost_per_km)}
                    </TableCell>
                    <TableCell>
                      {(rule.peak_hours_multiplier ?? 1).toFixed(1)}x
                    </TableCell>
                    <TableCell>
                      Rp {formatPrice(rule.rayon_base_surcharge)}
                    </TableCell>
                    <TableCell>
                      {rule.active ? (
                        <Badge variant="default" className="bg-green-600">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(rule)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(rule.id)}
                          disabled={deleteMutation.isPending}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {rules.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              No pricing rules yet. Create one to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Pricing Rule</DialogTitle>
            <DialogDescription>Update pricing configuration</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Service Type Select */}
            <div>
              <label className="text-sm font-medium">Service Type *</label>
              <select
                value={formData.service_id}
                onChange={(e) =>
                  setFormData({ ...formData, service_id: e.target.value })
                }
                className="w-full border rounded-md p-2 mt-1 bg-background"
              >
                <option value="">Select Service Type</option>
                {serviceTypes.map((st: ServiceType) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Base Multiplier */}
            <div>
              <label className="text-sm font-medium">
                Base Fare Multiplier *
              </label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={formData.base_multiplier}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    base_multiplier: parseFloat(e.target.value) || 1.0,
                  })
                }
              />
            </div>

            {/* Cost Per KM */}
            <div>
              <label className="text-sm font-medium">Cost Per Km (Rp) *</label>
              <Input
                type="number"
                step="100"
                min="0"
                value={formData.distance_cost_per_km}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    distance_cost_per_km: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            {/* Peak Multiplier */}
            <div>
              <label className="text-sm font-medium">
                Peak Hours Multiplier *
              </label>
              <Input
                type="number"
                step="0.1"
                min="1.0"
                value={formData.peak_multiplier}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    peak_multiplier: parseFloat(e.target.value) || 1.0,
                  })
                }
              />
            </div>

            {/* Rayon Surcharge */}
            <div>
              <label className="text-sm font-medium">
                Base Rayon Surcharge (Rp) *
              </label>
              <Input
                type="number"
                step="1000"
                min="0"
                value={formData.rayon_base_surcharge}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    rayon_base_surcharge: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <Button
              onClick={handleEditSubmit}
              disabled={updateMutation.isPending}
              className="w-full"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Rule'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
