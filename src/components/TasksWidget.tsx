import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { gapi } from 'gapi-script';
import { CheckCircle2, Circle, ListPlus, Calendar as CalendarIcon, Clock } from 'lucide-react';

export const TasksWidget: React.FC = () => {
    const { isSignedIn } = useAuth();
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDate, setNewTaskDate] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState('Medium');
    const [isAdding, setIsAdding] = useState(false);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        if (isSignedIn) {
            loadTasks();
        }
    }, [isSignedIn]);

    const loadTasks = async () => {
        setLoading(true);
        try {
            const listResponse = await (gapi.client as any).tasks.tasklists.list({
                maxResults: 10,
            });

            const tasklists = listResponse.result.items;
            if (tasklists && tasklists.length > 0) {
                const response = await (gapi.client as any).tasks.tasks.list({
                    tasklist: tasklists[0].id,
                    showCompleted: false,
                    maxResults: 50, // Fetch more for sorting
                });

                let fetchedTasks = response.result.items || [];

                // Client-side sort by due date
                fetchedTasks.sort((a: any, b: any) => {
                    if (!a.due) return 1;
                    if (!b.due) return -1;
                    return new Date(a.due).getTime() - new Date(b.due).getTime();
                });

                setTasks(fetchedTasks);
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim() || !newTaskDate || isAdding) {
            alert('Please fill in both title and due date.');
            return;
        }

        setIsAdding(true);
        try {
            const listResponse = await (gapi.client as any).tasks.tasklists.list({ maxResults: 1 });
            const tasklistId = listResponse.result.items[0].id;

            // 1. Create Google Task
            // Note: Google Tasks API 'due' must be RFC 3339 timestamp
            const dueTimestamp = new Date(newTaskDate).toISOString();

            await (gapi.client as any).tasks.tasks.insert({
                tasklist: tasklistId,
                resource: {
                    title: newTaskTitle,
                    due: dueTimestamp,
                    notes: `Priority: ${newTaskPriority}`,
                    status: 'needsAction'
                }
            });

            // 2. Create Google Calendar Event
            const calendarDay = new Date(newTaskDate);
            const calendarEnd = new Date(calendarDay);
            calendarEnd.setHours(23, 59, 59);

            await (gapi.client as any).calendar.events.insert({
                calendarId: 'primary',
                resource: {
                    summary: `[Task] ${newTaskTitle} (${newTaskPriority})`,
                    description: `Synced task with ${newTaskPriority} priority.`,
                    start: { date: newTaskDate }, // All-day event
                    end: { date: newTaskDate },   // All-day event usually end on same date for 1 day
                }
            });

            setNewTaskTitle('');
            setNewTaskDate('');
            setNewTaskPriority('Medium');
            setShowForm(false);
            await loadTasks();
        } catch (error) {
            console.error('Error adding task:', error);
            alert('Failed to add task. Please try again.');
        } finally {
            setIsAdding(false);
        }
    };

    const handleCompleteTask = async (taskId: string) => {
        try {
            const listResponse = await (gapi.client as any).tasks.tasklists.list({ maxResults: 1 });
            const tasklistId = listResponse.result.items[0].id;

            setTasks(prev => prev.filter(t => t.id !== taskId));

            await (gapi.client as any).tasks.tasks.patch({
                tasklist: tasklistId,
                task: taskId,
                resource: {
                    status: 'completed'
                }
            });
        } catch (error) {
            console.error('Error completing task:', error);
            loadTasks();
        }
    };

    const getPriorityColor = (notes: string) => {
        if (notes?.includes('Priority: High')) return 'bg-red-500/10 text-red-500 border-red-200';
        if (notes?.includes('Priority: Medium')) return 'bg-amber-500/10 text-amber-500 border-amber-200';
        return 'bg-blue-500/10 text-blue-500 border-blue-200';
    };

    if (!isSignedIn) {
        return (
            <div className="h-48 flex items-center justify-center text-zinc-400 italic text-sm">
                Sign in to view and manage your tasks
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {!showForm ? (
                <button
                    onClick={() => setShowForm(true)}
                    className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-400 hover:text-emerald-500 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all font-bold text-sm"
                >
                    <ListPlus className="w-5 h-5" />
                    Add New Task with Date & Priority
                </button>
            ) : (
                <form onSubmit={handleAddTask} className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4 animate-in slide-in-from-top-4 duration-300">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Task Title</label>
                        <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="What needs to be done?"
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Due Date</label>
                            <input
                                type="date"
                                value={newTaskDate}
                                onChange={(e) => setNewTaskDate(e.target.value)}
                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Priority</label>
                            <select
                                value={newTaskPriority}
                                onChange={(e) => setNewTaskPriority(e.target.value)}
                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            >
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={isAdding}
                            className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isAdding ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <ListPlus className="w-4 h-4" />}
                            Create Task & Sync
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="px-6 py-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold rounded-xl hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            <div className="space-y-3">
                {loading && tasks.length === 0 ? (
                    <div className="h-48 flex items-center justify-center space-y-2 flex-col">
                        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-zinc-500 font-medium tracking-tight">Syncing tasks...</span>
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-zinc-400 text-sm space-y-3">
                        <CheckCircle2 className="w-10 h-10 opacity-10" />
                        <p className="font-medium">No tasks for now.</p>
                    </div>
                ) : (
                    tasks.map((task) => (
                        <div key={task.id} className="group/task flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:bg-white dark:hover:bg-zinc-800 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300">
                            <button
                                onClick={() => handleCompleteTask(task.id)}
                                className="text-zinc-300 group-hover/task:text-emerald-500 transition-colors"
                            >
                                <Circle className="w-5 h-5" />
                            </button>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200 truncate group-hover/task:text-emerald-600 transition-colors">
                                        {task.title}
                                    </p>
                                    {task.notes && task.notes.includes('Priority:') && (
                                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${getPriorityColor(task.notes)}`}>
                                            {task.notes.split('Priority: ')[1]}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-[10px] font-medium text-zinc-500">
                                    {task.due && (
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            Due: {new Date(task.due).toLocaleDateString()}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1 text-blue-500/70">
                                        <CalendarIcon className="w-3 h-3" />
                                        Synced
                                    </span>
                                </div>
                            </div>
                            <div className="opacity-0 group-hover/task:opacity-100 transition-opacity">
                                <button onClick={() => handleCompleteTask(task.id)}>
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 hover:text-emerald-500" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
