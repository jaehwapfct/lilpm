import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot,
    User,
    CheckCircle2,
    Plus,
    GripVertical,
    ChevronRight,
} from 'lucide-react';

// Typing animation hook
function useTypingAnimation(text: string, speed: number = 50, start: boolean = true) {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        if (!start) {
            setDisplayedText('');
            setIsComplete(false);
            return;
        }

        let index = 0;
        setDisplayedText('');
        setIsComplete(false);

        const timer = setInterval(() => {
            if (index < text.length) {
                setDisplayedText(text.slice(0, index + 1));
                index++;
            } else {
                setIsComplete(true);
                clearInterval(timer);
            }
        }, speed);

        return () => clearInterval(timer);
    }, [text, speed, start]);

    return { displayedText, isComplete };
}

// Animated cursor component
function AnimatedCursor({
    path,
    duration = 2,
    color = '#8b5cf6',
    name = 'User',
}: {
    path: { x: number; y: number }[];
    duration?: number;
    color?: string;
    name?: string;
}) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (path.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % path.length);
        }, (duration * 1000) / path.length);

        return () => clearInterval(interval);
    }, [path, duration]);

    const position = path[currentIndex] || path[0];

    return (
        <motion.div
            animate={{ x: position.x, y: position.y }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            className="absolute z-50 pointer-events-none"
        >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                    d="M3 2L17 10L10 11L7 18L3 2Z"
                    fill={color}
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
            </svg>
            <div
                className="absolute left-4 top-4 px-2 py-0.5 rounded text-xs text-white whitespace-nowrap"
                style={{ backgroundColor: color }}
            >
                {name}
            </div>
        </motion.div>
    );
}

// Demo Scene Components
const scenes = [
    // Scene 1: Lily AI Chat - 대화 타이핑
    {
        id: 'lily-chat',
        title: 'Chat with Lily AI',
        component: function LilyChatScene() {
            const userMessage = "새로운 사용자 인증 기능을 만들어줘";
            const aiMessage = "네, 사용자 인증 기능을 위한 PRD를 작성하고 개발 티켓을 생성해 드릴게요. 어떤 인증 방식을 원하시나요? 이메일/비밀번호, OAuth, 또는 둘 다 지원할까요?";

            const [showAI, setShowAI] = useState(false);
            const { displayedText: userText, isComplete: userComplete } = useTypingAnimation(userMessage, 40, true);
            const { displayedText: aiText } = useTypingAnimation(aiMessage, 25, showAI);

            useEffect(() => {
                if (userComplete) {
                    const timer = setTimeout(() => setShowAI(true), 500);
                    return () => clearTimeout(timer);
                }
            }, [userComplete]);

            return (
                <div className="w-full max-w-lg mx-auto space-y-3">
                    {/* User Message */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-end"
                    >
                        <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2 max-w-[80%]">
                            <p className="text-sm">{userText}<span className="animate-pulse">|</span></p>
                        </div>
                    </motion.div>

                    {/* AI Response */}
                    <AnimatePresence>
                        {showAI && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex gap-2"
                            >
                                <div className="h-8 w-8 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                                    <Bot className="h-4 w-4 text-white" />
                                </div>
                                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2 max-w-[85%]">
                                    <p className="text-sm">{aiText}<span className="animate-pulse">|</span></p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            );
        },
    },
    // Scene 2: PRD & Ticket Auto-Generation
    {
        id: 'auto-generation',
        title: 'Auto-Generate PRD & Tickets',
        component: function AutoGenerationScene() {
            const [step, setStep] = useState(0);

            useEffect(() => {
                const timers = [
                    setTimeout(() => setStep(1), 800),
                    setTimeout(() => setStep(2), 1600),
                    setTimeout(() => setStep(3), 2400),
                    setTimeout(() => setStep(4), 3200),
                ];
                return () => timers.forEach(clearTimeout);
            }, []);

            const tickets = [
                { id: 'AUTH-1', title: '이메일 로그인 API 구현', status: 'Todo' },
                { id: 'AUTH-2', title: 'OAuth 소셜 로그인 연동', status: 'Todo' },
                { id: 'AUTH-3', title: '비밀번호 재설정 플로우', status: 'Todo' },
            ];

            return (
                <div className="w-full max-w-lg mx-auto">
                    {/* PRD Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-card border rounded-lg p-4 mb-4"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-6 w-6 rounded bg-violet-500/20 flex items-center justify-center">
                                <span className="text-xs">📄</span>
                            </div>
                            <span className="font-medium text-sm">사용자 인증 시스템 PRD</span>
                            {step >= 1 && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="ml-auto text-green-500"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                </motion.span>
                            )}
                        </div>
                        {step >= 1 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-xs text-muted-foreground"
                            >
                                생성 완료 • 자동으로 티켓 생성 중...
                            </motion.div>
                        )}
                    </motion.div>

                    {/* Generated Tickets */}
                    <div className="space-y-2">
                        {tickets.map((ticket, i) => (
                            step >= i + 2 && (
                                <motion.div
                                    key={ticket.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-card border rounded-lg p-3 flex items-center gap-3"
                                >
                                    <div className="h-5 w-5 rounded bg-blue-500/20 flex items-center justify-center">
                                        <span className="text-[10px]">🎫</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs text-muted-foreground">{ticket.id}</div>
                                        <div className="text-sm font-medium">{ticket.title}</div>
                                    </div>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{ticket.status}</span>
                                </motion.div>
                            )
                        ))}
                    </div>
                </div>
            );
        },
    },
    // Scene 3: Real-time PRD Editing
    {
        id: 'prd-editing',
        title: 'Real-time PRD Editor',
        component: function PRDEditingScene() {
            const content = "## 사용자 스토리\n\n사용자로서, 이메일과 비밀번호로 로그인할 수 있어야 합니다.\n\n## 기능 요구사항\n\n- 이메일 형식 검증\n- 비밀번호 최소 8자";
            const { displayedText } = useTypingAnimation(content, 35, true);

            return (
                <div className="w-full max-w-lg mx-auto">
                    <div className="bg-card border rounded-lg overflow-hidden">
                        {/* Editor Header */}
                        <div className="border-b px-4 py-2 flex items-center gap-2">
                            <span className="text-sm font-medium">인증 시스템 PRD</span>
                            <span className="ml-auto text-xs text-green-500 flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                저장 중...
                            </span>
                        </div>

                        {/* Editor Content */}
                        <div className="p-4 min-h-[200px] font-mono text-sm whitespace-pre-wrap">
                            {displayedText}<span className="animate-pulse text-primary">|</span>
                        </div>
                    </div>

                    {/* Collaborator indicator */}
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="flex -space-x-1">
                            <div className="h-5 w-5 rounded-full bg-violet-500 border-2 border-background" />
                            <div className="h-5 w-5 rounded-full bg-blue-500 border-2 border-background" />
                        </div>
                        <span>2명이 편집 중</span>
                    </div>
                </div>
            );
        },
    },
    // Scene 4: Kanban Board Drag & Drop
    {
        id: 'kanban',
        title: 'Kanban Board',
        component: function KanbanScene() {
            const [draggedItem, setDraggedItem] = useState<number | null>(null);
            const [columns, setColumns] = useState([
                { id: 'todo', title: 'Todo', items: ['로그인 API', 'OAuth 연동'] },
                { id: 'progress', title: 'In Progress', items: ['UI 디자인'] },
                { id: 'done', title: 'Done', items: [] },
            ]);

            useEffect(() => {
                // Simulate drag animation
                const timer1 = setTimeout(() => setDraggedItem(0), 1000);
                const timer2 = setTimeout(() => {
                    setColumns(prev => {
                        const newCols = [...prev];
                        newCols[0].items = newCols[0].items.slice(1);
                        newCols[1].items = ['로그인 API', ...newCols[1].items];
                        return newCols;
                    });
                    setDraggedItem(null);
                }, 2500);

                return () => {
                    clearTimeout(timer1);
                    clearTimeout(timer2);
                };
            }, []);

            return (
                <div className="w-full max-w-lg mx-auto relative">
                    <div className="flex gap-3">
                        {columns.map(col => (
                            <div key={col.id} className="flex-1 bg-muted/50 rounded-lg p-2">
                                <div className="text-xs font-medium mb-2 px-1">{col.title}</div>
                                <div className="space-y-2">
                                    {col.items.map((item, i) => (
                                        <motion.div
                                            key={item}
                                            layout
                                            className="bg-card border rounded p-2 text-xs flex items-center gap-2"
                                        >
                                            <GripVertical className="h-3 w-3 text-muted-foreground" />
                                            {item}
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Animated cursor */}
                    {draggedItem !== null && (
                        <AnimatedCursor
                            path={[
                                { x: 80, y: 60 },
                                { x: 120, y: 50 },
                                { x: 180, y: 55 },
                                { x: 220, y: 60 },
                            ]}
                            duration={1.5}
                            name="나"
                            color="#8b5cf6"
                        />
                    )}
                </div>
            );
        },
    },
    // Scene 5: Gantt Chart Timeline
    {
        id: 'gantt',
        title: 'Gantt Chart',
        component: function GanttScene() {
            const [progress, setProgress] = useState(0);

            useEffect(() => {
                const timer = setInterval(() => {
                    setProgress(prev => Math.min(prev + 5, 100));
                }, 200);
                return () => clearInterval(timer);
            }, []);

            const tasks = [
                { name: 'API 개발', start: 0, width: 40, color: '#8b5cf6' },
                { name: 'UI 구현', start: 30, width: 35, color: '#3b82f6' },
                { name: 'QA 테스트', start: 55, width: 25, color: '#22c55e' },
            ];

            return (
                <div className="w-full max-w-lg mx-auto">
                    <div className="bg-card border rounded-lg overflow-hidden">
                        {/* Timeline Header */}
                        <div className="border-b px-4 py-2 flex">
                            <div className="w-24 text-xs font-medium">작업</div>
                            <div className="flex-1 flex text-xs text-muted-foreground">
                                {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map(w => (
                                    <div key={w} className="flex-1 text-center">{w}</div>
                                ))}
                            </div>
                        </div>

                        {/* Tasks */}
                        <div className="p-2 space-y-2">
                            {tasks.map(task => (
                                <div key={task.name} className="flex items-center">
                                    <div className="w-24 text-xs truncate pr-2">{task.name}</div>
                                    <div className="flex-1 h-6 bg-muted/30 rounded relative">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{
                                                width: `${Math.min((progress - task.start) * (task.width / 50), task.width)}%`,
                                                opacity: progress >= task.start ? 1 : 0,
                                            }}
                                            className="absolute h-full rounded"
                                            style={{ left: `${task.start}%`, backgroundColor: task.color }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        },
    },
    // Scene 6: Real-time Collaboration
    {
        id: 'collaboration',
        title: 'Real-time Collaboration',
        component: function CollaborationScene() {
            return (
                <div className="w-full max-w-lg mx-auto relative min-h-[200px]">
                    {/* Issue Card */}
                    <div className="bg-card border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-muted-foreground">AUTH-1</span>
                            <div className="flex -space-x-1">
                                <div className="h-6 w-6 rounded-full bg-violet-500 border-2 border-background flex items-center justify-center text-[10px] text-white">김</div>
                                <div className="h-6 w-6 rounded-full bg-blue-500 border-2 border-background flex items-center justify-center text-[10px] text-white">이</div>
                                <div className="h-6 w-6 rounded-full bg-green-500 border-2 border-background flex items-center justify-center text-[10px] text-white">박</div>
                            </div>
                        </div>
                        <h3 className="font-medium mb-2">이메일 로그인 API 구현</h3>
                        <div className="text-sm text-muted-foreground">3명이 이 이슈를 보고 있습니다</div>
                    </div>

                    {/* Multiple Cursors */}
                    <AnimatedCursor
                        path={[
                            { x: 50, y: 40 },
                            { x: 100, y: 60 },
                            { x: 150, y: 50 },
                            { x: 200, y: 70 },
                        ]}
                        duration={3}
                        name="김철수"
                        color="#8b5cf6"
                    />
                    <AnimatedCursor
                        path={[
                            { x: 250, y: 80 },
                            { x: 200, y: 100 },
                            { x: 180, y: 90 },
                            { x: 220, y: 110 },
                        ]}
                        duration={4}
                        name="이영희"
                        color="#3b82f6"
                    />
                </div>
            );
        },
    },
];

export function ProductDemoShowcase() {
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    const [key, setKey] = useState(0); // For resetting animations

    // Auto-advance scenes every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSceneIndex(prev => (prev + 1) % scenes.length);
            setKey(prev => prev + 1);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const currentScene = scenes[currentSceneIndex];
    const SceneComponent = currentScene.component;

    return (
        <div className="relative rounded-xl border border-border bg-card overflow-hidden shadow-2xl">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-blue-500/5" />

            {/* Mac-style window chrome */}
            <div className="border-b px-4 py-3 flex items-center gap-2 bg-muted/30">
                <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500" />
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 flex justify-center">
                    <div className="px-4 py-1 rounded-md bg-muted text-xs text-muted-foreground">
                        app.lilpm.io
                    </div>
                </div>
            </div>

            {/* Scene Content */}
            <div className="relative min-h-[350px] p-6">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`${currentSceneIndex}-${key}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                        className="h-full"
                    >
                        <SceneComponent />
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Scene Progress */}
            <div className="border-t px-6 py-4 flex items-center justify-between bg-muted/20">
                <div className="text-sm font-medium">{currentScene.title}</div>
                <div className="flex gap-1.5">
                    {scenes.map((scene, index) => (
                        <button
                            key={scene.id}
                            onClick={() => {
                                setCurrentSceneIndex(index);
                                setKey(prev => prev + 1);
                            }}
                            className={`h-1.5 rounded-full transition-all duration-300 ${index === currentSceneIndex
                                    ? 'w-6 bg-primary'
                                    : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                                }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
