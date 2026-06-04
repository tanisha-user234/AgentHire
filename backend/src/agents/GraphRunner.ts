import { AgentRole, InterviewPhase } from './AgentOrchestrator';

export interface GraphNode {
  id: string;
  agentRole: AgentRole;
  phase: InterviewPhase;
  title: string;
  description?: string;
  config?: {
    maxQuestions?: number;
    confidenceThreshold?: number;
    deepProbeNodeId?: string;
    nextDefaultNodeId?: string;
  };
}

export interface GraphEdge {
  fromNodeId: string;
  toNodeId: string;
  conditionType: 'default' | 'keyword' | 'score' | 'confidence' | 'manual';
  conditionValue?: string | number;
}

export interface InterviewGraph {
  id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  startNodeId: string;
}

export class GraphRunner {
  private graph: InterviewGraph;
  private currentNodeId: string;
  private traversalLog: string[] = [];

  constructor(graph: InterviewGraph, initialState?: { currentNodeId: string; traversalLog: string[] }) {
    this.graph = graph;
    this.currentNodeId = initialState?.currentNodeId || graph.startNodeId;
    this.traversalLog = initialState?.traversalLog || [this.currentNodeId];
  }

  getCurrentNode(): GraphNode | undefined {
    return this.graph.nodes.find(n => n.id === this.currentNodeId);
  }

  getNextNode(context: {
    lastResponse?: string;
    scores?: Record<string, number>;
    confidence?: number;
    questionCount?: number;
  }): GraphNode | undefined {
    const edges = this.graph.edges.filter(e => e.fromNodeId === this.currentNodeId);
    
    // Sort edges by priority (more specific conditions first)
    const sortedEdges = [...edges].sort((a, b) => {
      if (a.conditionType === 'default') return 1;
      if (b.conditionType === 'default') return -1;
      return 0;
    });

    for (const edge of sortedEdges) {
      if (this.evaluateEdge(edge, context)) {
        this.currentNodeId = edge.toNodeId;
        this.traversalLog.push(this.currentNodeId);
        return this.getCurrentNode();
      }
    }

    return undefined;
  }

  private evaluateEdge(edge: GraphEdge, context: any): boolean {
    switch (edge.conditionType) {
      case 'default':
        return true;
      case 'keyword':
        return context.lastResponse?.toLowerCase().includes(String(edge.conditionValue).toLowerCase()) || false;
      case 'score':
        // Simplified: check if any score is above threshold
        return Object.values(context.scores || {}).some(s => (edge.conditionValue as number));
      case 'confidence':
        return (context.confidence || 0) >= (edge.conditionValue as number);
      default:
        return false;
    }
  }

  getState() {
    return {
      currentNodeId: this.currentNodeId,
      traversalLog: this.traversalLog,
    };
  }
}
