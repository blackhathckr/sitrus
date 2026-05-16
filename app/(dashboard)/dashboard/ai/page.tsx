/**
 * Sitrus AI Chat Page
 *
 * ChatGPT-like interface for creators to generate content,
 * scripts, captions, and research. Streams responses from GPT-4o-mini.
 * Rate limited to 5 messages/day per creator.
 *
 * @module app/(dashboard)/dashboard/ai/page
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Send, Loader2, Sparkles, RotateCcw, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// ---------------------------------------------------------------------------
// Markdown Renderer (lightweight)
// ---------------------------------------------------------------------------

function renderMarkdown(text: string): string {
  return text
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-muted rounded-md p-3 my-2 overflow-x-auto text-sm"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3 class="font-semibold text-base mt-3 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="font-semibold text-lg mt-3 mb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="font-bold text-xl mt-3 mb-1">$1</h1>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul class="my-1">$1</ul>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

// ---------------------------------------------------------------------------
// Suggested Prompts
// ---------------------------------------------------------------------------

const SUGGESTIONS = [
  {
    title: 'Instagram Caption',
    prompt: 'Write an engaging Instagram caption for a fashion product post. Make it catchy with relevant hashtags.',
  },
  {
    title: 'Reel Script',
    prompt: 'Write a 30-second Instagram Reel script for promoting a trendy outfit. Include hook, body, and CTA.',
  },
  {
    title: 'Brand Outreach',
    prompt: 'Write a professional DM template for reaching out to a fashion brand for a collaboration.',
  },
  {
    title: 'Product Review',
    prompt: 'Help me write an honest and engaging product review script for a YouTube video.',
  },
];

const DAILY_LIMIT = 5;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SitrusAIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch remaining count on mount
  useEffect(() => {
    fetch('/api/ai/chat/remaining')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.remaining === 'number') setRemaining(data.remaining);
      })
      .catch(() => {});
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const generateId = () => Math.random().toString(36).slice(2, 10);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;
      if (remaining !== null && remaining <= 0) {
        toast.error('Daily limit reached. Resets at midnight UTC.');
        return;
      }

      const userMessage: Message = { id: generateId(), role: 'user', content: content.trim() };
      const assistantMessage: Message = { id: generateId(), role: 'assistant', content: '' };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setInput('');
      setIsStreaming(true);

      const abortController = new AbortController();
      abortRef.current = abortController;

      try {
        const allMessages = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: allMessages }),
          signal: abortController.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (typeof err.remaining === 'number') setRemaining(err.remaining);
          throw new Error(err.error || `Request failed (${res.status})`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response stream');

        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) { toast.error(parsed.error); break; }
              if (parsed.content) {
                accumulated += parsed.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessage.id ? { ...m, content: accumulated } : m
                  )
                );
              }
              if (typeof parsed.remaining === 'number') {
                setRemaining(parsed.remaining);
              }
            } catch { /* skip malformed chunks */ }
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        const message = err instanceof Error ? err.message : 'Something went wrong';
        toast.error(message);
        setMessages((prev) =>
          prev.filter((m) => m.id !== assistantMessage.id || m.content.length > 0)
        );
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, isStreaming, remaining]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleNewChat = () => {
    if (isStreaming && abortRef.current) abortRef.current.abort();
    setMessages([]);
    setInput('');
    setIsStreaming(false);
  };

  const isEmpty = messages.length === 0;
  const limitReached = remaining !== null && remaining <= 0;

  return (
    <div className="flex flex-1 flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="size-5 sm:size-6 text-primary" />
            Sitrus AI
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Your AI assistant for content creation, copywriting, and research
          </p>
        </div>
        <div className="flex items-center gap-2">
          {remaining !== null && (
            <Badge variant={limitReached ? 'destructive' : 'secondary'} className="text-xs">
              {DAILY_LIMIT - remaining}/{DAILY_LIMIT} used today
            </Badge>
          )}
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleNewChat}>
              <RotateCcw className="size-3.5" />
              New Chat
            </Button>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 rounded-lg border bg-background">
        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6">
              <div className="flex flex-col items-center gap-2">
                <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="size-7 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">How can I help you today?</h2>
                <p className="text-muted-foreground text-sm text-center max-w-md">
                  I can help with captions, scripts, brand outreach, content ideas, and more.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    onClick={() => sendMessage(s.prompt)}
                    disabled={limitReached}
                    className="text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <p className="font-medium text-sm">{s.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{s.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 pb-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                      <Sparkles className="size-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-lg px-4 py-2.5 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      msg.content ? (
                        <div
                          className="prose prose-sm dark:prose-invert max-w-none [&_pre]:my-2 [&_ul]:my-1 [&_li]:my-0"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="size-3.5 animate-spin" />
                          Thinking...
                        </div>
                      )
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted mt-0.5">
                      <User className="size-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4">
          {limitReached ? (
            <div className="text-center py-3">
              <p className="text-sm text-muted-foreground">
                Daily limit reached ({DAILY_LIMIT}/{DAILY_LIMIT}). Resets at midnight UTC.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2 items-end">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Sitrus AI anything..."
                disabled={isStreaming}
                rows={1}
                className="min-h-[44px] max-h-[160px] resize-none"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isStreaming}
                className="shrink-0 size-[44px]"
              >
                {isStreaming ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </form>
          )}
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Sitrus AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
