import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Plus,
  Sparkles,
  Brain,
  Settings2,
  GripVertical,
  Shuffle,
  Zap,
  Eye,
  EyeOff,
  Check,
  Trash2,
  ExternalLink,
  Key,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout';
import { useMCPStore } from '@/stores/mcpStore';
import { LLM_PROVIDERS, type LLMProvider, type LLMCapability } from '@/types/mcp';
import { toast } from 'sonner';

const CAPABILITY_LABELS: Record<LLMCapability, string> = {
  code: 'Code',
  analysis: 'Analysis',
  creative: 'Creative',
  multimodal: 'Multimodal',
  reasoning: 'Reasoning',
  fast: 'Fast',
};

const STRATEGY_DESCRIPTIONS = {
  round_robin: 'Uses registered models in rotation',
  capability_based: 'Automatically selects the best model for the task type',
  load_balanced: 'Distributes load across models',
  cost_optimized: 'Prioritizes cost-effective model selection',
};

export function LLMSettingsPage() {
  const navigate = useNavigate();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<any>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState('api-keys');
  
  const { 
    models, 
    toggleModel, 
    addModel,
    updateModel,
    removeModel,
    setModelPriority,
    initializePresetModels,
    autoMixEnabled,
    autoMixStrategy,
    defaultModelId,
    setAutoMixEnabled,
    setAutoMixStrategy,
    setDefaultModel,
    getModelsWithValidKeys,
    providerApiKeys,
    setProviderApiKey,
    hasValidProviderKey,
  } = useMCPStore();

  // Initialize preset models on mount
  useEffect(() => {
    initializePresetModels();
  }, [initializePresetModels]);

  // New model form state
  const [newModel, setNewModel] = useState({
    name: '',
    provider: 'openai' as LLMProvider,
    description: '',
    modelId: '',
    priority: 1,
    capabilities: [] as LLMCapability[],
  });

  const handleToggle = (id: string, name: string, enabled: boolean) => {
    toggleModel(id);
    toast.success(enabled ? `${name} disabled` : `${name} enabled`);
  };

  const handleAddModel = () => {
    if (!newModel.name.trim()) {
      toast.error('Please enter a model name');
      return;
    }
    
    addModel({
      ...newModel,
      enabled: true,
    });
    
    toast.success('New model added');
    setIsAddDialogOpen(false);
    setNewModel({
      name: '',
      provider: 'openai',
      description: '',
      modelId: '',
      priority: 1,
      capabilities: [],
    });
  };

  const handleSaveEdit = () => {
    if (!editingModel) return;
    
    updateModel(editingModel.id, editingModel);
    toast.success('Model settings saved');
    setEditingModel(null);
  };

  const handleDelete = (id: string, name: string) => {
    removeModel(id);
    toast.success(`${name} deleted`);
  };

  const toggleShowKey = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCapability = (capability: LLMCapability) => {
    const current = newModel.capabilities;
    if (current.includes(capability)) {
      setNewModel({ ...newModel, capabilities: current.filter((c) => c !== capability) });
    } else {
      setNewModel({ ...newModel, capabilities: [...current, capability] });
    }
  };

  const modelsWithKeys = getModelsWithValidKeys();
  const connectedProviders = Object.entries(providerApiKeys).filter(([_, key]) => key?.length > 0).length;

  return (
    <AppLayout>
      <div className="w-full p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
              <Brain className="h-5 w-5 md:h-6 md:w-6" />
              LLM Model Management
            </h1>
            <p className="text-sm text-slate-400">
              Register AI providers and manage auto-mix settings
            </p>
          </div>
          <Badge variant="secondary" className="self-start sm:self-auto">
            {connectedProviders} provider(s) connected
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="api-keys" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="models" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Models
            </TabsTrigger>
          </TabsList>

          {/* API Keys Tab */}
          <TabsContent value="api-keys" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Provider API Keys
                </CardTitle>
                <CardDescription>
                  Enter your API keys for each AI provider. Keys are stored locally and never sent to our servers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {(Object.keys(LLM_PROVIDERS) as LLMProvider[])
                  .filter(p => p !== 'custom')
                  .map((provider) => {
                    const config = LLM_PROVIDERS[provider];
                    const hasKey = hasValidProviderKey(provider);
                    
                    return (
                      <div key={provider} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{config.icon}</span>
                            <span className="font-medium">{config.name}</span>
                            {hasKey && (
                              <Badge variant="default" className="bg-green-500/20 text-green-400 text-xs">
                                <Check className="h-3 w-3 mr-1" />
                                Connected
                              </Badge>
                            )}
                          </div>
                          {config.docsUrl && (
                            <a 
                              href={config.docsUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-slate-400 hover:text-primary flex items-center gap-1"
                            >
                              Get API key
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type={showKeys[provider] ? 'text' : 'password'}
                            placeholder={config.apiKeyPlaceholder}
                            value={providerApiKeys[provider] || ''}
                            onChange={(e) => setProviderApiKey(provider, e.target.value)}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => toggleShowKey(provider)}
                          >
                            {showKeys[provider] ? (
                              <EyeOff className="h-4 w-4 text-slate-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-slate-400" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Models Tab */}
          <TabsContent value="models" className="space-y-6 mt-6">
            {/* Auto Mix Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shuffle className="h-5 w-5" />
                  Auto Mix Mode
                </CardTitle>
                <CardDescription>
                  Automatically select the best model based on your chosen strategy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Enable Auto Mix</Label>
                    <p className="text-sm text-slate-400">
                      Automatically rotate between enabled models
                    </p>
                  </div>
                  <Switch
                    checked={autoMixEnabled}
                    onCheckedChange={setAutoMixEnabled}
                    disabled={modelsWithKeys.length < 2}
                  />
                </div>

                {autoMixEnabled && modelsWithKeys.length >= 2 && (
                  <div className="space-y-3">
                    <Label>Mix Strategy</Label>
                    <Select value={autoMixStrategy} onValueChange={(v) => setAutoMixStrategy(v as typeof autoMixStrategy)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="round_robin">
                          <span className="flex items-center gap-2">
                            🔄 Round Robin
                          </span>
                        </SelectItem>
                        <SelectItem value="capability_based">
                          <span className="flex items-center gap-2">
                            🎯 Capability Based
                          </span>
                        </SelectItem>
                        <SelectItem value="load_balanced">
                          <span className="flex items-center gap-2">
                            ⚖️ Load Balanced
                          </span>
                        </SelectItem>
                        <SelectItem value="cost_optimized">
                          <span className="flex items-center gap-2">
                            💰 Cost Optimized
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-slate-400">
                      {STRATEGY_DESCRIPTIONS[autoMixStrategy]}
                    </p>
                  </div>
                )}

                {!autoMixEnabled && (
                  <div className="space-y-3">
                    <Label>Default Model</Label>
                    <Select 
                      value={defaultModelId || ''} 
                      onValueChange={(v) => setDefaultModel(v || null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select default model" />
                      </SelectTrigger>
                      <SelectContent>
                        {modelsWithKeys.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <span className="flex items-center gap-2">
                              {LLM_PROVIDERS[model.provider].icon} {model.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {modelsWithKeys.length < 2 && (
                  <Alert>
                    <Zap className="h-4 w-4" />
                    <AlertDescription>
                      Auto mix mode requires at least 2 enabled models with valid API keys.
                      Add your API keys in the "API Keys" tab.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Add Model Button */}
            <div className="flex justify-end">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Model
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New LLM Model</DialogTitle>
                    <DialogDescription>
                      Register a new AI model
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Model Name</Label>
                      <Input
                        placeholder="GPT-4o"
                        value={newModel.name}
                        onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Provider</Label>
                      <Select
                        value={newModel.provider}
                        onValueChange={(v) => setNewModel({ ...newModel, provider: v as LLMProvider })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(LLM_PROVIDERS) as LLMProvider[]).map((key) => (
                            <SelectItem key={key} value={key}>
                              <span className="flex items-center gap-2">
                                {LLM_PROVIDERS[key].icon} {LLM_PROVIDERS[key].name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Model ID</Label>
                      <Input
                        placeholder="gpt-4o, claude-3-sonnet, etc."
                        value={newModel.modelId}
                        onChange={(e) => setNewModel({ ...newModel, modelId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        placeholder="Model description"
                        value={newModel.description}
                        onChange={(e) => setNewModel({ ...newModel, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Priority (1 = highest)</Label>
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[newModel.priority]}
                          onValueChange={([v]) => setNewModel({ ...newModel, priority: v })}
                          min={1}
                          max={10}
                          step={1}
                          className="flex-1"
                        />
                        <span className="w-8 text-center font-mono">{newModel.priority}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Capabilities</Label>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(CAPABILITY_LABELS).map(([key, label]) => (
                          <Badge
                            key={key}
                            variant={newModel.capabilities.includes(key as LLMCapability) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => toggleCapability(key as LLMCapability)}
                          >
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddModel}>
                      Add
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Models List */}
            <div className="space-y-4">
              {models.map((model) => {
                const hasProviderKey = hasValidProviderKey(model.provider);
                
                return (
                  <Card 
                    key={model.id}
                    className={`transition-all ${model.enabled && hasProviderKey ? 'ring-2 ring-primary/50' : 'opacity-75'}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-5 w-5 text-slate-400 cursor-grab hidden sm:block" />
                          <span className="text-2xl">{LLM_PROVIDERS[model.provider].icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{model.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {LLM_PROVIDERS[model.provider].name}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                Priority: {model.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-400 mt-1">{model.description}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {model.capabilities.map((cap) => (
                                <Badge key={cap} variant="outline" className="text-xs">
                                  {CAPABILITY_LABELS[cap]}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                          {hasProviderKey ? (
                            <Badge variant="default" className="bg-green-500/20 text-green-400 text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              API Key Set
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              No API Key
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingModel(model)}
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                          <Switch
                            checked={model.enabled}
                            onCheckedChange={() => handleToggle(model.id, model.name, model.enabled)}
                            disabled={!hasProviderKey}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Empty state */}
            {models.length === 0 && (
              <div className="text-center py-12">
                <Brain className="h-12 w-12 mx-auto text-slate-400/50" />
                <h3 className="mt-4 text-lg font-medium">No models registered</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Add a new model to power up Lil PM AI
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={!!editingModel} onOpenChange={() => setEditingModel(null)}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Model Settings</DialogTitle>
              <DialogDescription>
                Configure {editingModel?.name}
              </DialogDescription>
            </DialogHeader>
            {editingModel && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Model Name</Label>
                  <Input
                    value={editingModel.name}
                    onChange={(e) => setEditingModel({ ...editingModel, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Model ID</Label>
                  <Input
                    placeholder="gpt-4o, claude-3-sonnet, etc."
                    value={editingModel.modelId || ''}
                    onChange={(e) => setEditingModel({ ...editingModel, modelId: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={editingModel.description}
                    onChange={(e) => setEditingModel({ ...editingModel, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority (1 = highest)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[editingModel.priority]}
                      onValueChange={([v]) => setEditingModel({ ...editingModel, priority: v })}
                      min={1}
                      max={10}
                      step={1}
                      className="flex-1"
                    />
                    <span className="w-8 text-center font-mono">{editingModel.priority}</span>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="flex gap-2">
              <Button 
                variant="destructive" 
                onClick={() => {
                  handleDelete(editingModel.id, editingModel.name);
                  setEditingModel(null);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
