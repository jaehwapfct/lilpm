import { useState, useCallback } from 'react';
import { useMCPStore } from '@/stores/mcpStore';
import { toast } from 'sonner';
import type { MCPConnector, MCPCategory } from '@/types/mcp';

interface NewConnectorForm {
    name: string;
    description: string;
    icon: string;
    category: MCPCategory;
    configType: 'manual';
    apiEndpoint: string;
    apiKey: string;
}

const INITIAL_NEW_CONNECTOR: NewConnectorForm = {
    name: '',
    description: '',
    icon: '🔌',
    category: 'productivity',
    configType: 'manual',
    apiEndpoint: '',
    apiKey: '',
};

export function useMCPSettingsHandlers() {
    const {
        connectors,
        toggleConnector,
        addConnector,
        updateConnector,
        removeConnector,
    } = useMCPStore();

    // Form state
    const [newConnector, setNewConnector] = useState<NewConnectorForm>(INITIAL_NEW_CONNECTOR);
    const [jsonConfig, setJsonConfig] = useState('');
    const [addMode, setAddMode] = useState<'manual' | 'json'>('manual');

    // Test connection state
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleToggle = useCallback((id: string, name: string, enabled: boolean) => {
        toggleConnector(id);
        toast.success(enabled ? `${name} disconnected` : `${name} connected`);
    }, [toggleConnector]);

    const handleAddConnector = useCallback((onClose: () => void) => {
        if (addMode === 'json') {
            try {
                const config = JSON.parse(jsonConfig);
                if (config.mcpServers) {
                    Object.entries(config.mcpServers).forEach(([name, serverConfig]: [string, any]) => {
                        let endpoint = '';
                        let apiKey = '';
                        let description = '';

                        if (serverConfig.url) {
                            endpoint = serverConfig.url;
                            if (serverConfig.headers?.Authorization) {
                                apiKey = serverConfig.headers.Authorization.replace('Bearer ', '');
                            }
                            description = `MCP Server: ${endpoint}`;
                        } else if (serverConfig.args) {
                            endpoint = serverConfig.args.find((arg: string) => arg.startsWith('http')) || '';
                            const authIndex = serverConfig.args.findIndex((arg: string) => arg === '--header');
                            if (authIndex !== -1 && serverConfig.args[authIndex + 1]) {
                                const authHeader = serverConfig.args[authIndex + 1];
                                if (authHeader.startsWith('Authorization: Bearer ')) {
                                    apiKey = authHeader.replace('Authorization: Bearer ', '');
                                }
                            }
                            description = `Custom MCP: ${serverConfig.command} ${(serverConfig.args || []).slice(0, 2).join(' ')}`;
                        }

                        addConnector({
                            name,
                            description,
                            icon: '🔌',
                            category: 'development',
                            configType: 'manual',
                            apiEndpoint: endpoint,
                            apiKey,
                            mcpConfig: serverConfig,
                            enabled: false,
                        });
                    });
                    toast.success('MCP servers added from JSON config');
                } else {
                    toast.error('Invalid JSON format. Expected mcpServers object.');
                    return;
                }
            } catch (e) {
                toast.error('Invalid JSON format');
                return;
            }
            setJsonConfig('');
        } else {
            if (!newConnector.name.trim()) {
                toast.error('Please enter a connector name');
                return;
            }

            addConnector({
                ...newConnector,
                enabled: false,
            });
            toast.success('New connector added');
        }

        onClose();
        setNewConnector(INITIAL_NEW_CONNECTOR);
        setAddMode('manual');
    }, [addMode, jsonConfig, newConnector, addConnector]);

    const handleTestConnection = useCallback(async (editingConnector: MCPConnector | null) => {
        if (!editingConnector) return;

        setIsTesting(true);
        setTestResult(null);

        try {
            let endpoint = editingConnector.apiEndpoint || '';
            let apiKey = editingConnector.apiKey || '';
            const mcpConfig = editingConnector.mcpConfig as any;

            if (mcpConfig) {
                if (mcpConfig.url) {
                    endpoint = mcpConfig.url;
                    if (mcpConfig.headers?.Authorization) {
                        apiKey = mcpConfig.headers.Authorization.replace('Bearer ', '');
                    }
                } else if (mcpConfig.args) {
                    const urlArg = mcpConfig.args.find((arg: string) => arg.startsWith('http'));
                    if (urlArg) endpoint = urlArg;

                    const authIndex = mcpConfig.args.findIndex((arg: string) => arg === '--header');
                    if (authIndex !== -1 && mcpConfig.args[authIndex + 1]) {
                        const authHeader = mcpConfig.args[authIndex + 1];
                        if (authHeader.startsWith('Authorization: Bearer ')) {
                            apiKey = authHeader.replace('Authorization: Bearer ', '');
                        }
                    }
                } else if (mcpConfig.mcpServers) {
                    const serverName = Object.keys(mcpConfig.mcpServers)[0];
                    const server = mcpConfig.mcpServers[serverName];
                    if (server?.url) {
                        endpoint = server.url;
                        if (server.headers?.Authorization) {
                            apiKey = server.headers.Authorization.replace('Bearer ', '');
                        }
                    } else if (server?.args) {
                        const urlArg = server.args.find((arg: string) => arg.startsWith('http'));
                        if (urlArg) endpoint = urlArg;
                    }
                }
            }

            if (!endpoint) {
                setTestResult({ success: false, message: 'No endpoint configured. Check your JSON config format.' });
                return;
            }

            const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://lbzjnhlribtfwnoydpdv.supabase.co';
            const MCP_PROXY_URL = `${SUPABASE_URL}/functions/v1/mcp-proxy`;

            // Health check
            try {
                const healthCheck = await fetch(MCP_PROXY_URL, { method: 'GET' });
                const healthData = await healthCheck.json();
                if (healthData.status !== 'ok') {
                    setTestResult({ success: false, message: `Edge Function health check failed: ${JSON.stringify(healthData)}` });
                    return;
                }
            } catch (healthError) {
                setTestResult({
                    success: false,
                    message: `❌ Cannot reach MCP Proxy Edge Function.\n\nURL: ${MCP_PROXY_URL}\nError: ${healthError instanceof Error ? healthError.message : 'Unknown'}`
                });
                return;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);

            const response = await fetch(MCP_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint, apiKey, action: 'list', params: {} }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            const result = await response.json();

            if (result.success) {
                setTestResult({
                    success: true,
                    message: `✅ MCP Connection Successful!\n\nEndpoint: ${endpoint}\nPattern: ${result.pattern}\n\nResponse:\n${JSON.stringify(result.data, null, 2).substring(0, 500)}`
                });
            } else {
                let errorMsg = `❌ MCP Connection Failed\n\nEndpoint: ${endpoint}\nError: ${result.error}\n`;
                if (result.attempts) {
                    errorMsg += '\n--- Attempted Patterns ---\n';
                    result.attempts.forEach((attempt: any) => {
                        errorMsg += `\n${attempt.pattern}\n  Status: ${attempt.status}\n  Error: ${attempt.error || 'N/A'}\n`;
                    });
                }
                setTestResult({ success: false, message: errorMsg });
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                setTestResult({ success: false, message: '⏱️ Timeout: MCP call took too long (60s).' });
            } else {
                setTestResult({ success: false, message: `❌ Error: ${error instanceof Error ? error.message : JSON.stringify(error)}` });
            }
        } finally {
            setIsTesting(false);
        }
    }, []);

    const handleSaveEdit = useCallback((
        editingConnector: MCPConnector | null,
        onClose: () => void
    ) => {
        if (!editingConnector) return;

        // Validate JSON config if present
        if (editingConnector.mcpConfig && (editingConnector.mcpConfig as any)._raw) {
            try {
                const config = JSON.parse((editingConnector.mcpConfig as any)._raw);
                editingConnector.mcpConfig = config;
            } catch {
                toast.error('Invalid JSON configuration');
                return;
            }
        }

        // Update API endpoint from mcpConfig if available
        if (editingConnector.mcpConfig?.args) {
            const endpoint = editingConnector.mcpConfig.args.find((arg: string) => arg.startsWith('http'));
            if (endpoint) editingConnector.apiEndpoint = endpoint;

            const authIndex = editingConnector.mcpConfig.args.findIndex((arg: string) => arg === '--header');
            if (authIndex !== -1 && editingConnector.mcpConfig.args[authIndex + 1]) {
                const authHeader = editingConnector.mcpConfig.args[authIndex + 1];
                if (authHeader.startsWith('Authorization: Bearer ')) {
                    editingConnector.apiKey = authHeader.replace('Authorization: Bearer ', '');
                }
            }
        }

        updateConnector(editingConnector.id, editingConnector);
        toast.success('Connector updated');
        setTestResult(null);
        onClose();
    }, [updateConnector]);

    const handleDelete = useCallback((id: string, name: string) => {
        removeConnector(id);
        toast.success(`${name} deleted`);
    }, [removeConnector]);

    return {
        // State
        connectors,
        newConnector,
        setNewConnector,
        jsonConfig,
        setJsonConfig,
        addMode,
        setAddMode,
        isTesting,
        testResult,
        setTestResult,

        // Handlers
        handleToggle,
        handleAddConnector,
        handleTestConnection,
        handleSaveEdit,
        handleDelete,
    };
}
