'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { useConvexAuth } from 'convex/react';
import { ArrowLeft, FolderOpen, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';

function getRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

export default function ProjectsPage() {
    const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
    const projects = useQuery(api.projects.getUserProjects);
    const deleteProjectMutation = useMutation(api.projects.deleteProject);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this project?')) return;

        setDeletingId(id);
        try {
            await deleteProjectMutation({ projectId: id as Id<"projects"> });
        } catch (error) {
            console.error('Failed to delete project:', error);
        } finally {
            setDeletingId(null);
        }
    };

    // Loading state - ensure dark background matches rest of app
    if (isAuthLoading || projects === undefined) {
        return (
            <div className="h-screen w-full bg-[#1e1e1e] flex items-center justify-center font-mono" style={{ backgroundColor: '#1e1e1e' }}>
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
        );
    }

    // Not authenticated
    if (!isAuthenticated) {
        return (
            <div className="h-screen w-full bg-[#1e1e1e] flex flex-col items-center justify-center gap-4 font-mono">
                <FolderOpen className="w-10 h-10 text-zinc-600" />
                <h1 className="text-sm font-medium text-zinc-100">Sign in to view your projects</h1>
                <Link
                    href="/"
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                    Go back home
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-[#1e1e1e] text-[#d4d4d4] font-mono p-6">
            {/* Header */}
            <div className="max-w-5xl mx-auto mb-8">
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Link>
                    <div className="h-4 w-px bg-zinc-700" />
                    <h1 className="text-sm font-semibold text-zinc-100">My Projects</h1>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto">
                {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
                            <FolderOpen className="w-5 h-5 text-blue-400" />
                        </div>
                        <h2 className="text-sm font-medium text-zinc-100">No projects yet</h2>
                        <p className="text-xs text-zinc-500 text-center max-w-sm">
                            Start creating your first app design and it will appear here.
                        </p>
                        <Link
                            href="/"
                            className="mt-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium rounded-lg hover:bg-blue-500/20 transition-colors"
                        >
                            Create your first project
                        </Link>
                    </div>
                ) : (
                    <>
                        <p className="text-xs text-zinc-500 mb-6">
                            {projects.length} project{projects.length !== 1 ? 's' : ''}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {projects.map((project) => (
                                <Link
                                    key={project._id}
                                    href={`/?project=${project._id}`}
                                    className={`group relative bg-[#252526] border border-[#3e3e42] rounded-xl overflow-hidden transition-all hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 ${deletingId === project._id ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    {/* Preview */}
                                    <div className="relative w-full aspect-[16/10] bg-[#1a1a1a] overflow-hidden">
                                        {project.previewImage ? (
                                            <img
                                                src={project.previewImage}
                                                alt={project.title}
                                                className="w-full h-full object-cover object-top"
                                            />
                                        ) : project.previewHtml ? (
                                            <div className="absolute inset-0 origin-top-left scale-[0.2] w-[500%] h-[500%]">
                                                <iframe
                                                    srcDoc={project.previewHtml}
                                                    className="w-full h-full border-0 pointer-events-none"
                                                    sandbox="allow-same-origin"
                                                    title={project.title}
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-zinc-600 text-xs">
                                                No preview
                                            </div>
                                        )}

                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3">
                                            <span className="text-xs text-white font-medium">Open Project</span>
                                        </div>
                                    </div>

                                    {/* Card content */}
                                    <div className="p-3 flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-xs font-medium text-zinc-100 truncate">
                                                {project.title}
                                            </h3>
                                            <p className="text-[10px] text-zinc-500 mt-0.5">
                                                {getRelativeTime(project.createdAt)}
                                            </p>
                                        </div>

                                        <button
                                            onClick={(e) => handleDelete(e, project._id)}
                                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                                            title="Delete project"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
