/**
 * Admin AI Usage Dashboard
 *
 * Shows token usage, costs, and per-creator stats for Sitrus AI.
 *
 * @module app/(admin)/admin/ai-usage/page
 */

'use client';

import { useState, useEffect } from 'react';
import { Sparkles, MessageSquare, Coins, Clock, Zap } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Summary {
  totalMessages: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  avgTokensPerMessage: number;
}

interface TopCreator {
  creatorId: string;
  name: string;
  email: string;
  messageCount: number;
  totalTokens: number;
  totalCost: number;
}

interface LogEntry {
  id: string;
  creatorName: string;
  creatorEmail: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminAIUsagePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [topCreators, setTopCreators] = useState<TopCreator[]>([]);
  const [recentLogs, setRecentLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = async (from?: string, to?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      const res = await fetch(`/api/admin/ai-usage?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');

      const data = await res.json();
      setSummary(data.summary);
      setTopCreators(data.topCreators);
      setRecentLogs(data.recentLogs);
    } catch {
      console.error('Failed to fetch AI usage data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFilter = () => {
    fetchData(dateFrom || undefined, dateTo || undefined);
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="size-6 text-primary" />
          AI Usage Dashboard
        </h1>
        <p className="text-muted-foreground text-sm">
          Monitor Sitrus AI token usage, costs, and creator activity
        </p>
      </div>

      {/* Date Filter */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1">
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
            <button
              onClick={handleFilter}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
            >
              Filter
            </button>
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); fetchData(); }}
              className="px-4 py-2 bg-muted text-muted-foreground rounded-md text-sm font-medium hover:bg-muted/80"
            >
              Reset
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <MessageSquare className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalMessages.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Avg {summary.avgTokensPerMessage.toLocaleString()} tokens/msg
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
              <Zap className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalTokens.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {summary.totalInputTokens.toLocaleString()} in / {summary.totalOutputTokens.toLocaleString()} out
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <Coins className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summary.totalCostUsd.toFixed(4)}</div>
              <p className="text-xs text-muted-foreground">
                GPT-4o-mini ($0.15/1M in, $0.60/1M out)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
              <Clock className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.avgLatencyMs}ms</div>
              <p className="text-xs text-muted-foreground">
                End-to-end stream time
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Creators */}
      <Card>
        <CardHeader>
          <CardTitle>Top Creators by Usage</CardTitle>
          <CardDescription>Creators ranked by message count</CardDescription>
        </CardHeader>
        <CardContent>
          {topCreators.length === 0 ? (
            <p className="text-sm text-muted-foreground">No usage data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Creator</th>
                    <th className="text-right py-2 font-medium">Messages</th>
                    <th className="text-right py-2 font-medium">Tokens</th>
                    <th className="text-right py-2 font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {topCreators.map((creator) => (
                    <tr key={creator.creatorId} className="border-b last:border-0">
                      <td className="py-2">
                        <div className="font-medium">{creator.name}</div>
                        <div className="text-xs text-muted-foreground">{creator.email}</div>
                      </td>
                      <td className="text-right py-2">
                        <Badge variant="secondary">{creator.messageCount}</Badge>
                      </td>
                      <td className="text-right py-2">{creator.totalTokens.toLocaleString()}</td>
                      <td className="text-right py-2">${creator.totalCost.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Last 50 AI chat interactions</CardDescription>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Creator</th>
                    <th className="text-left py-2 font-medium">Model</th>
                    <th className="text-right py-2 font-medium">In</th>
                    <th className="text-right py-2 font-medium">Out</th>
                    <th className="text-right py-2 font-medium">Cost</th>
                    <th className="text-right py-2 font-medium">Latency</th>
                    <th className="text-right py-2 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="py-2">
                        <div className="font-medium text-xs">{log.creatorName}</div>
                      </td>
                      <td className="py-2">
                        <Badge variant="outline" className="text-xs">{log.model}</Badge>
                      </td>
                      <td className="text-right py-2 text-xs">{log.inputTokens}</td>
                      <td className="text-right py-2 text-xs">{log.outputTokens}</td>
                      <td className="text-right py-2 text-xs">${log.costUsd.toFixed(5)}</td>
                      <td className="text-right py-2 text-xs">{log.latencyMs}ms</td>
                      <td className="text-right py-2 text-xs whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
