import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MCPConnector, LLMModel, LLMProvider, ProviderAPIKey } from '@/types/mcp';
import { PRESET_MCP_CONNECTORS, PRESET_LLM_MODELS } from '@/types/mcp';

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15);

interface MCPState {
  // MCP Connectors
  connectors: MCPConnector[];
  addConnector: (connector: Omit<MCPConnector, 'id'>) => void;
  updateConnector: (id: string, updates: Partial<MCPConnector>) => void;
  removeConnector: (id: string) => void;
  toggleConnector: (id: string) => void;
  initializePresetConnectors: () => void;
  
  // LLM Models
  models: LLMModel[];
  addModel: (model: Omit<LLMModel, 'id'>) => void;
  updateModel: (id: string, updates: Partial<LLMModel>) => void;
  removeModel: (id: string) => void;
  toggleModel: (id: string) => void;
  setModelPriority: (id: string, priority: number) => void;
  initializePresetModels: () => void;
  
  // Provider API Keys (centralized storage)
  providerApiKeys: Record<LLMProvider, string>;
  setProviderApiKey: (provider: LLMProvider, apiKey: string) => void;
  getProviderApiKey: (provider: LLMProvider) => string | undefined;
  hasValidProviderKey: (provider: LLMProvider) => boolean;
  
  // Auto-mix settings
  autoMixEnabled: boolean;
  autoMixStrategy: 'round_robin' | 'capability_based' | 'load_balanced' | 'cost_optimized';
  defaultModelId: string | null;
  setAutoMixEnabled: (enabled: boolean) => void;
  setAutoMixStrategy: (strategy: 'round_robin' | 'capability_based' | 'load_balanced' | 'cost_optimized') => void;
  setDefaultModel: (modelId: string | null) => void;
  
  // Get active connectors/models
  getActiveConnectors: () => MCPConnector[];
  getActiveModels: () => LLMModel[];
  getNextAutoModel: () => LLMModel | null;
  getModelsWithValidKeys: () => LLMModel[];
  
  // Onboarding state
  onboardingCompleted: boolean;
  setOnboardingCompleted: (completed: boolean) => void;
  
  // Model selection for auto-mix
  lastUsedModelIndex: number;
}

export const useMCPStore = create<MCPState>()(
  persist(
    (set, get) => ({
      // Initial state
      connectors: [],
      models: [],
      providerApiKeys: {
        anthropic: '',
        openai: '',
        gemini: '',
        mistral: '',
        cohere: '',
        custom: '',
      },
      autoMixEnabled: true,
      autoMixStrategy: 'capability_based',
      defaultModelId: null,
      lastUsedModelIndex: 0,
      onboardingCompleted: false,

      // MCP Connector actions
      addConnector: (connector) =>
        set((state) => ({
          connectors: [...state.connectors, { ...connector, id: generateId() }],
        })),

      updateConnector: (id, updates) =>
        set((state) => ({
          connectors: state.connectors.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),

      removeConnector: (id) =>
        set((state) => ({
          connectors: state.connectors.filter((c) => c.id !== id),
        })),

      toggleConnector: (id) =>
        set((state) => ({
          connectors: state.connectors.map((c) =>
            c.id === id ? { ...c, enabled: !c.enabled } : c
          ),
        })),

      initializePresetConnectors: () => {
        const { connectors } = get();
        if (connectors.length === 0) {
          set({
            connectors: PRESET_MCP_CONNECTORS.map((preset) => ({
              ...preset,
              id: generateId(),
              enabled: false,
            })),
          });
        }
      },

      // LLM Model actions
      addModel: (model) =>
        set((state) => ({
          models: [...state.models, { ...model, id: generateId() }],
        })),

      updateModel: (id, updates) =>
        set((state) => ({
          models: state.models.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),

      removeModel: (id) =>
        set((state) => ({
          models: state.models.filter((m) => m.id !== id),
          defaultModelId:
            state.defaultModelId === id ? null : state.defaultModelId,
        })),

      toggleModel: (id) =>
        set((state) => ({
          models: state.models.map((m) =>
            m.id === id ? { ...m, enabled: !m.enabled } : m
          ),
        })),

      setModelPriority: (id, priority) =>
        set((state) => ({
          models: state.models.map((m) =>
            m.id === id ? { ...m, priority } : m
          ),
        })),

      initializePresetModels: () => {
        const { models } = get();
        if (models.length === 0) {
          set({
            models: PRESET_LLM_MODELS.map((preset) => ({
              ...preset,
              id: generateId(),
              enabled: false,
            })),
          });
        }
      },

      // Provider API Key management
      setProviderApiKey: (provider, apiKey) =>
        set((state) => ({
          providerApiKeys: {
            ...state.providerApiKeys,
            [provider]: apiKey,
          },
          // Auto-enable models from this provider if key is set
          models: state.models.map((m) =>
            m.provider === provider && apiKey
              ? { ...m, apiKey, enabled: true }
              : m
          ),
        })),

      getProviderApiKey: (provider) => {
        return get().providerApiKeys[provider] || undefined;
      },

      hasValidProviderKey: (provider) => {
        const key = get().providerApiKeys[provider];
        return !!key && key.length > 0;
      },

      // Auto-mix settings
      setAutoMixEnabled: (enabled) => set({ autoMixEnabled: enabled }),
      setAutoMixStrategy: (strategy) => set({ autoMixStrategy: strategy }),
      setDefaultModel: (modelId) => set({ defaultModelId: modelId }),

      // Onboarding
      setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),

      // Getters
      getActiveConnectors: () => {
        const { connectors } = get();
        return connectors.filter((c) => c.enabled);
      },

      getActiveModels: () => {
        const { models } = get();
        return models.filter((m) => m.enabled).sort((a, b) => a.priority - b.priority);
      },

      getModelsWithValidKeys: () => {
        const { models, providerApiKeys } = get();
        return models.filter((m) => {
          const providerKey = providerApiKeys[m.provider];
          return m.enabled && providerKey && providerKey.length > 0;
        });
      },

      getNextAutoModel: () => {
        const { autoMixEnabled, autoMixStrategy, defaultModelId, providerApiKeys, models, lastUsedModelIndex } = get();
        
        // Get models with valid provider keys
        const activeModels = models.filter((m) => {
          const providerKey = providerApiKeys[m.provider];
          return m.enabled && providerKey && providerKey.length > 0;
        });

        if (activeModels.length === 0) return null;

        // If auto-mix is disabled, return default model or first active
        if (!autoMixEnabled) {
          if (defaultModelId) {
            return activeModels.find((m) => m.id === defaultModelId) || activeModels[0];
          }
          return activeModels[0];
        }

        // Auto-mix strategies
        switch (autoMixStrategy) {
          case 'round_robin': {
            const nextIndex = (lastUsedModelIndex + 1) % activeModels.length;
            set({ lastUsedModelIndex: nextIndex });
            return activeModels[nextIndex];
          }
          case 'capability_based':
          case 'load_balanced':
          case 'cost_optimized':
          default:
            // Sort by priority and return the top one
            return activeModels.sort((a, b) => a.priority - b.priority)[0];
        }
      },
    }),
    {
      name: 'mcp-store',
      partialize: (state) => ({
        connectors: state.connectors,
        models: state.models,
        providerApiKeys: state.providerApiKeys,
        autoMixEnabled: state.autoMixEnabled,
        autoMixStrategy: state.autoMixStrategy,
        defaultModelId: state.defaultModelId,
        onboardingCompleted: state.onboardingCompleted,
      }),
    }
  )
);
