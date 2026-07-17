import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Shell } from "@/components/layout/Shell";
import {
  useGetTrendingPosts,
  useGetSuggestedUsers,
  useGetSuggestedCommunities,
  useSearchGlobal,
  useGetTrendingTopics,
  useLikePost,
  useFollowUser,
  useJoinCommunity,
  useSendFriendRequest,
  useGetSearchHistory,
  useClearSearchHistory,
  getSearchGlobalQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp, Heart, MessageCircle, UserPlus, CheckCircle, Clock, Building2 } from "lucide-react";
import { getPageTypeLabel } from "@/lib/page-types";
import { formatDistanceToNow } from "date-fns";

const TREND_COLORS = [
  "from-violet-600/20 to-indigo-600/20 border-violet-500/20",
  "from-pink-600/20 to-rose-600/20 border-pink-500/20",
  "from-amber-500/20 to-orange-600/20 border-amber-500/20",
  "from-emerald-500/20 to-teal-600/20 border-emerald-500/20",
  "from-cyan-500/20 to-blue-600/20 border-cyan-500/20",
];

export default function Explore() {
  const [query, setQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("q") ?? "";
  });
  const [activeTab, setActiveTab] = useState<"trending" | "people" | "topics" | "communities">("trending");

  const { data: trendingPosts, isLoading: trendingLoading } = useGetTrendingPosts();
  const { data: suggestedUsers } = useGetSuggestedUsers();
  const { data: suggestedCommunities } = useGetSuggestedCommunities();
  const { data: trendingTopics } = useGetTrendingTopics();
  const { data: searchResults, isLoading: searchLoading } = useSearchGlobal(
    { q: query },
    { query: { enabled: query.length > 1, queryKey: getSearchGlobalQueryKey({ q: query }) } }
  );

  const likePost = useLikePost();
  const followUser = useFollowUser();
  const joinCommunity = useJoinCommunity();
  const sendFriendRequest = useSendFriendRequest();
  const { data: searchHistory } = useGetSearchHistory();
  const clearHistory = useClearSearchHistory();
  const qc = useQueryClient();

  const hasSearchResults =
    searchResults &&
    ((searchResults.users?.length ?? 0) > 0 ||
      (searchResults.communities?.length ?? 0) > 0 ||
      (searchResults.pages?.length ?? 0) > 0 ||
      (searchResults.posts?.length ?? 0) > 0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (query.trim().length > 0) url.searchParams.set("q", query.trim());
    else url.searchParams.delete("q");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }, [query]);

  return (
    <Shell>
      <div className="max-w-4xl mx-auto w-full p-4 pb-24">
        <h1 className="text-2xl font-bold mb-4 neon-title">Explorar</h1>

        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar perfiles, páginas, grupos y publicaciones..."
            className="pl-12 h-12 rounded-2xl bg-white/5 border-border/50 text-base"
            data-testid="input-search"
          />
        </div>

        {!query && (searchHistory?.length ?? 0) > 0 && (
          <div className="mb-6 glass-panel rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Búsquedas recientes
              </span>
              <button
                type="button"
                onClick={() => clearHistory.mutate()}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Borrar
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(searchHistory ?? []).map((term: string) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setQuery(term)}
                  className="px-3 py-1 rounded-full text-xs bg-white/5 hover:bg-primary/20 border border-border transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {query.length > 1 && (
          <div className="mb-6 glass-panel rounded-2xl overflow-hidden">
            {searchLoading ? (
              <div className="p-4 text-center text-muted-foreground text-sm">Buscando...</div>
            ) : hasSearchResults ? (
              <div>
                {(searchResults.users?.length ?? 0) > 0 && (
                  <div className="px-4 py-2 border-b border-border/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">Perfiles</div>
                )}
                {(searchResults.users?.length ?? 0) > 0 && searchResults.users.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                    <Link href={`/profile/${user.id}`}>
                      <img src={user.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} className="w-10 h-10 rounded-full object-cover bg-muted cursor-pointer" alt="" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/profile/${user.id}`} className="font-medium text-sm hover:text-primary">
                        {user.displayName}
                      </Link>
                      <div className="text-xs text-muted-foreground">@{user.username}</div>
                    </div>
                    <Button size="sm" variant={user.isFollowing ? "outline" : "default"} onClick={() => followUser.mutate({ userId: user.id }, { onSuccess: () => qc.invalidateQueries() })} data-testid={`button-follow-${user.id}`}>
                      {user.isFollowing ? "Siguiendo" : "Seguir"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => sendFriendRequest.mutate({ userId: user.id })} className="px-2" title="Enviar solicitud">
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="px-4 py-2 border-y border-border/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">Páginas y negocios</div>
                {(searchResults.pages?.length ?? 0) === 0 ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">Sin páginas encontradas.</div>
                ) : (
                  searchResults.pages.map((page: any) => (
                    <Link key={page.id} href={`/business/${page.id}`}>
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/40 to-accent/40 border border-primary/30 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{page.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {page.category}
                            {page.pageType ? ` · ${getPageTypeLabel(page.pageType)}` : ""}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
                <div className="px-4 py-2 border-y border-border/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">Grupos / Comunidades</div>
                {(searchResults.communities?.length ?? 0) === 0 ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">Sin grupos encontrados.</div>
                ) : (
                  searchResults.communities.map((community) => (
                    <Link key={community.id} href={`/communities/${community.id}`}>
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center font-bold">
                          {community.name?.[0] ?? "C"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{community.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{community.membersCount ?? 0} miembros</div>
                        </div>
                        <Button
                          size="sm"
                          variant={community.isJoined ? "outline" : "default"}
                          onClick={(e) => {
                            e.preventDefault();
                            joinCommunity.mutate({ communityId: community.id }, { onSuccess: () => qc.invalidateQueries() });
                          }}
                        >
                          {community.isJoined ? "Unido" : "Unirme"}
                        </Button>
                      </div>
                    </Link>
                  ))
                )}
                {(searchResults.posts?.length ?? 0) > 0 && (
                  <>
                    <div className="px-4 py-2 border-y border-border/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">Publicaciones</div>
                    {searchResults.posts.map((post: any) => (
                      <div key={post.id} className="px-4 py-3 border-b border-border/20 last:border-0">
                        <p className="text-sm line-clamp-2">{post.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          por{" "}
                          <Link href={`/profile/${post.author?.id ?? post.authorId}`} className="hover:text-primary">
                            {post.author?.displayName ?? "Usuario"}
                          </Link>
                        </p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground text-sm">Sin resultados</div>
            )}
          </div>
        )}

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {(["trending", "people", "topics", "communities"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`} data-testid={`tab-${tab}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === "trending" && (
          <div className="space-y-4">
            {trendingLoading
              ? [...Array(4)].map((_, i) => <div key={i} className="h-40 glass-panel rounded-2xl animate-pulse" />)
              : trendingPosts?.map((post) => (
                <div key={post.id} className="glass-panel rounded-2xl p-4" data-testid={`card-post-${post.id}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <Link href={`/profile/${post.author.id}`}>
                      <img src={post.author.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author.id}`} className="w-9 h-9 rounded-full object-cover bg-muted cursor-pointer" alt="" />
                    </Link>
                    <div>
                      <Link href={`/profile/${post.author.id}`} className="font-semibold text-sm flex items-center gap-1 hover:text-primary w-fit">
                        {post.author.displayName}
                        {post.author.isVerified && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                      </Link>
                      <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.createdAt))} ago</div>
                    </div>
                  </div>
                  <p className="text-sm mb-3 line-clamp-3">{post.content}</p>
                  <div className="flex gap-4 text-muted-foreground text-sm">
                    <button onClick={() => likePost.mutate({ postId: post.id, data: { reaction: "like" } })} className="flex items-center gap-1.5 hover:text-red-400 transition-colors" data-testid={`button-like-${post.id}`}>
                      <Heart className="w-4 h-4" />{post.likesCount}
                    </button>
                    <span className="flex items-center gap-1.5"><MessageCircle className="w-4 h-4" />{post.commentsCount}</span>
                  </div>
                </div>
              ))}
          </div>
        )}

        {activeTab === "people" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {suggestedUsers?.map((user) => (
              <div key={user.id} className="glass-panel rounded-2xl p-5 flex flex-col items-center text-center gap-3" data-testid={`card-user-${user.id}`}>
                <Link href={`/profile/${user.id}`}>
                  <img src={user.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} className="w-16 h-16 rounded-full object-cover bg-muted cursor-pointer" alt="" />
                </Link>
                <div>
                  <Link href={`/profile/${user.id}`} className="font-semibold flex items-center justify-center gap-1 hover:text-primary">
                    {user.displayName}
                    {user.isVerified && <CheckCircle className="w-4 h-4 text-primary" />}
                  </Link>
                  <div className="text-sm text-muted-foreground">@{user.username}</div>
                  <div className="text-xs text-muted-foreground mt-1">{user.followersCount} followers</div>
                </div>
                <Button size="sm" className="w-full" variant={user.isFollowing ? "outline" : "default"} onClick={() => followUser.mutate({ userId: user.id }, { onSuccess: () => qc.invalidateQueries() })} data-testid={`button-follow-${user.id}`}>
                  <UserPlus className="w-4 h-4 mr-1" />{user.isFollowing ? "Siguiendo" : "Seguir"}
                </Button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "topics" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {trendingTopics?.map((topic, i) => (
              <div key={topic.topic} className={`glass-panel rounded-2xl p-5 border bg-gradient-to-br ${TREND_COLORS[i % TREND_COLORS.length]}`} data-testid={`card-topic-${i}`}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground capitalize">{topic.trend}</span>
                </div>
                <div className="font-bold text-lg">{topic.topic}</div>
                <div className="text-sm text-muted-foreground mt-1">{topic.postsCount.toLocaleString()} posts</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "communities" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {suggestedCommunities?.map((community) => (
              <div key={community.id} className="glass-panel rounded-2xl overflow-hidden" data-testid={`card-community-${community.id}`}>
                <div className="h-20 bg-gradient-to-br from-primary/20 to-accent/20 relative">
                  <div className="absolute -bottom-6 left-4">
                    <div className="w-12 h-12 rounded-full border-2 border-background bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg">
                      {community.name[0]}
                    </div>
                  </div>
                </div>
                <div className="pt-8 p-4">
                  <div className="font-semibold">{community.name}</div>
                  <div className="text-xs text-muted-foreground mb-3">{community.membersCount.toLocaleString()} members</div>
                  <Button size="sm" className="w-full" variant={community.isJoined ? "outline" : "default"} onClick={() => joinCommunity.mutate({ communityId: community.id }, { onSuccess: () => qc.invalidateQueries() })} data-testid={`button-join-${community.id}`}>
                    {community.isJoined ? "Joined" : "Join"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
