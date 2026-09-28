import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface GitHubRepoItem {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url?: string;
    html_url: string;
  };
  html_url: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  default_branch: string;
  fork?: boolean;
}

@Injectable()
export class GitHubService {
  private readonly logger = new Logger(GitHubService.name);
  private client: AxiosInstance;
  private hasToken: boolean = false;

  constructor() {
    const token = process.env.GITHUB_TOKEN?.trim();
    this.hasToken = !!token;

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'UnifyVault-Early-Radar-Discovery/1.0',
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
      this.logger.log('GitHubService initialized with authenticated token.');
    } else {
      this.logger.warn(
        'GitHubService initialized WITHOUT token (public rate limit applies: 60 req/hr).',
      );
    }

    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers,
      timeout: 15000,
    });
  }

  async searchRepositories(
    query: string,
    sort: 'updated' | 'stars' | 'forks' = 'updated',
    perPage: number = 15,
  ): Promise<GitHubRepoItem[]> {
    try {
      this.logger.log(
        `Searching GitHub repositories with query: "${query}" (sort: ${sort}, count: ${perPage})`,
      );
      const response = await this.client.get('/search/repositories', {
        params: {
          q: query,
          sort,
          order: 'desc',
          per_page: perPage,
        },
      });
      return response.data?.items || [];
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      this.logger.error(`GitHub API search failed: ${msg}`);
      throw new Error(`GitHub API search error: ${msg}`);
    }
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepoItem | null> {
    try {
      const res = await this.client.get(`/repos/${owner}/${repo}`);
      return res.data;
    } catch (err: any) {
      this.logger.warn(`Failed to fetch repo ${owner}/${repo}: ${err.message}`);
      return null;
    }
  }

  async getRecentCommitsCount(owner: string, repo: string, days: number = 30): Promise<number> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const res = await this.client.get(`/repos/${owner}/${repo}/commits`, {
        params: { since, per_page: 100 },
      });
      return Array.isArray(res.data) ? res.data.length : 0;
    } catch (err: any) {
      return 0;
    }
  }

  async getContributorsCount(owner: string, repo: string): Promise<number> {
    try {
      const res = await this.client.get(`/repos/${owner}/${repo}/contributors`, {
        params: { per_page: 30, anon: 'true' },
      });
      return Array.isArray(res.data) ? res.data.length : 1;
    } catch (err: any) {
      return 1;
    }
  }

  async getReleasesCount(owner: string, repo: string): Promise<number> {
    try {
      const res = await this.client.get(`/repos/${owner}/${repo}/releases`, {
        params: { per_page: 10 },
      });
      return Array.isArray(res.data) ? res.data.length : 0;
    } catch (err: any) {
      return 0;
    }
  }
}
