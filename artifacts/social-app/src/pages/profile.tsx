import { useEffect, useState, useRef } from "react";
import { useParams, Link, useLocation } from "wouter";
import { Shell } from "@/components/layout/Shell";
import {
  useGetUser,
  useGetMe,
  useFollowUser,
  useUnfollowUser,
  useGetUserPosts,
  useCreatePost,
  useUpdateMe,
  getGetUserQueryKey,
  getGetUserPostsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CheckCircle, MapPin, Link as LinkIcon, Edit3, Grid, Heart, MessageCircle,
  FileText, Briefcase, GraduationCap, Globe, Languages, Award, Calendar,
  Phone, X, Plus, Camera, ImageIcon, Star, BookOpen, Bookmark, Image, BarChart3, Sparkles,
} from "lucide-react";
import { ProfilePhotosTab } from "@/components/profile/ProfilePhotosTab";
import { ProfileAvatarsTab } from "@/components/profile/ProfileAvatarsTab";
import { ProfileSavedTab } from "@/components/profile/ProfileSavedTab";
import { ProfileStatsTab } from "@/components/profile/ProfileStatsTab";
import { useUser } from "@clerk/react";
import { uploadFile, LOCAL_STORAGE_BUDGET_HINT } from "@/lib/upload";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { FormSelect } from "@/components/ui/form-select";

const ROLE_COLORS: Record<string, string> = {
  user: "bg-gray-500",
  creator: "bg-purple-500",
  company: "bg-blue-500",
  recruiter: "bg-green-500",
  influencer: "bg-pink-500",
  moderator: "bg-orange-500",
  admin: "bg-red-500",
};

const ROLE_LABELS: Record<string, string> = {
  user: "Usuario", creator: "Creador", company: "Empresa", recruiter: "Reclutador",
  influencer: "Influencer", moderator: "Moderador", admin: "Admin",
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  single: "Soltero/a",
  in_relationship: "En una relación",
  married: "Casado/a",
  engaged: "Comprometido/a",
  complicated: "Es complicado",
  divorced: "Divorciado/a",
  widowed: "Viudo/a",
  prefer_not_to_say: "Prefiero no decirlo",
};

export default function Profile() {
  const params = useParams<{ userId: string }>();
  const [, setLocation] = useLocation();
  const userId = params.userId ?? "";
  const { data: me } = useGetMe();
  const { user: clerkUser } = useUser();

  const isOwnProfile = me && (me.id === userId || me.clerkId === userId);
  const targetUserId = isOwnProfile ? me.id : userId;

  const { data: profile, isLoading } = useGetUser(
    targetUserId,
    { query: { enabled: !!targetUserId, queryKey: getGetUserQueryKey(targetUserId) } }
  );
  const { data: userPosts, isLoading: postsLoading } = useGetUserPosts(targetUserId, {
    query: { enabled: !!targetUserId, queryKey: getGetUserPostsQueryKey(targetUserId) },
  });
  const createPost = useCreatePost();
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();
  const updateMe = useUpdateMe();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [wallText, setWallText] = useState("");
  const [profileTab, setProfileTab] = useState(() => {
    if (typeof window === "undefined") return "posts";
    return new URLSearchParams(window.location.search).get("tab") || "posts";
  });

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab") || "posts";
    setProfileTab(tab);
  }, [userId]);

  const [editMode, setEditMode] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editBirthVisibility, setEditBirthVisibility] = useState("amigos");
  const [editGender, setEditGender] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRelationshipStatus, setEditRelationshipStatus] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editSkills, setEditSkills] = useState<{ skill: string; level: string }[]>([]);
  const [editExperience, setEditExperience] = useState<any[]>([]);
  const [editEducation, setEditEducation] = useState<any[]>([]);
  const [editLanguages, setEditLanguages] = useState<{ language: string; proficiency: string }[]>([]);
  const [editSocialLinks, setEditSocialLinks] = useState<{ platform: string; url: string }[]>([]);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const handlePublishWall = () => {
    if (!wallText.trim() || !isOwnProfile) return;
    createPost.mutate(
      { data: { content: wallText, visibility: "publico" } },
      {
        onSuccess: () => {
          setWallText("");
          qc.invalidateQueries({ queryKey: getGetUserPostsQueryKey(targetUserId) });
          qc.invalidateQueries({ queryKey: getGetUserQueryKey(targetUserId) });
          qc.invalidateQueries({ queryKey: ["feed"] });
        },
        onError: () => toast({ title: "Error", description: "No se pudo publicar en tu muro." }),
      },
    );
  };

  const handleFollow = () => {
    if (!profile) return;
    if (profile.isFollowing) {
      unfollowUser.mutate({ userId: targetUserId }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetUserQueryKey(targetUserId) }) });
    } else {
      followUser.mutate({ userId: targetUserId }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetUserQueryKey(targetUserId) }) });
    }
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isOwnProfile) return;
    setAvatarUploading(true);
    try {
      const url = await uploadFile(file, { purpose: "avatar" });
      updateMe.mutate(
        { data: { avatarUrl: url } },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["me"] });
            qc.invalidateQueries({ queryKey: getGetUserQueryKey(targetUserId) });
            qc.invalidateQueries({ queryKey: ["feed"] });
            qc.invalidateQueries({ queryKey: ["stories"] });
            toast({ title: "Foto actualizada", description: "Tu avatar ya es visible para otros usuarios." });
          },
        },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo subir la foto.";
      toast({ title: "Error al subir", description: `${msg} ${LOCAL_STORAGE_BUDGET_HINT}` });
    } finally { setAvatarUploading(false); }
  };

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isOwnProfile) return;
    setCoverUploading(true);
    try {
      const url = await uploadFile(file, { purpose: "cover" });
      updateMe.mutate(
        { data: { coverUrl: url } },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["me"] });
            qc.invalidateQueries({ queryKey: getGetUserQueryKey(targetUserId) });
            toast({ title: "Portada actualizada" });
          },
        },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo subir la portada.";
      toast({ title: "Error al subir", description: `${msg} ${LOCAL_STORAGE_BUDGET_HINT}` });
    } finally { setCoverUploading(false); }
  };

  const openEdit = () => {
    setEditBio(profile?.bio ?? "");
    setEditLocation(profile?.location ?? "");
    setEditWebsite(profile?.website ?? "");
    setEditBirthDate(profile?.birthDate ?? "");
    setEditBirthVisibility((profile as any)?.birthDateVisibility ?? "amigos");
    setEditGender(profile?.gender ?? "");
    setEditPhone(profile?.phone ?? "");
    setEditRelationshipStatus(profile?.relationshipStatus ?? "");
    setEditRole(profile?.role ?? "user");
    setEditSkills(profile?.skills?.map((s: any) => ({ skill: s.skill, level: s.level })) ?? []);
    setEditExperience(profile?.experience?.map((e: any) => ({ ...e })) ?? []);
    setEditEducation(profile?.education?.map((e: any) => ({ ...e })) ?? []);
    setEditLanguages(profile?.languages?.map((l: any) => ({ language: l.language, proficiency: l.proficiency })) ?? []);
    setEditSocialLinks(profile?.socialLinks?.map((l: any) => ({ platform: l.platform, url: l.url })) ?? []);
    setEditMode(true);
  };

  const handleSaveEdit = () => {
    updateMe.mutate({
      data: {
        bio: editBio, location: editLocation, website: editWebsite,
        birthDate: editBirthDate,
        birthDateVisibility: editBirthVisibility as any,
        gender: (editGender || undefined) as any,
        phone: editPhone,
        role: (editRole || undefined) as any,
        relationshipStatus: editRelationshipStatus || undefined,
        skills: editSkills.map(s => ({ skill: s.skill, level: s.level as any })),
        experience: editExperience,
        education: editEducation,
        languages: editLanguages.map(l => ({ language: l.language, proficiency: l.proficiency as any })),
        socialLinks: editSocialLinks,
      }
    }, {
      onSuccess: () => { setEditMode(false); qc.invalidateQueries(); }
    });
  };

  const displayProfile = profile ?? (isOwnProfile ? me : null);

  const normalizedUserId = (userId || "").trim().toLowerCase();
  useEffect(() => {
    if (!normalizedUserId || normalizedUserId === "undefined" || normalizedUserId === "null") {
      setLocation("/profile", { replace: true });
    }
  }, [normalizedUserId, setLocation]);

  if (isLoading || !displayProfile) {
    return (
      <Shell>
        <div className="max-w-4xl mx-auto w-full pb-24">
          <div className="h-48 bg-muted/50 animate-pulse" />
          <div className="px-6 pt-4">
            <div className="w-28 h-28 rounded-full bg-muted animate-pulse -mt-14 mb-4" />
            <div className="h-8 bg-muted rounded w-48 mb-2 animate-pulse" />
            <div className="h-4 bg-muted rounded w-32 animate-pulse" />
          </div>
        </div>
      </Shell>
    );
  }

  const avatar = displayProfile.avatarUrl ?? clerkUser?.imageUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayProfile.id}`;
  const cover = displayProfile.coverUrl;

  return (
    <Shell>
      <div className="max-w-4xl mx-auto w-full pb-24">
        {/* Cover */}
        <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary/30 to-accent/30 overflow-hidden">
          {cover && <img src={cover} className="w-full h-full object-cover" alt="" loading="lazy" decoding="async" />}
          {isOwnProfile && (
            <>
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleUploadCover} />
              <button onClick={() => coverRef.current?.click()} disabled={coverUploading}
                className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur text-white text-xs hover:bg-black/70 transition-colors">
                <Camera className="w-3.5 h-3.5" />{coverUploading ? "..." : "Cambiar portada"}
              </button>
            </>
          )}
          {isOwnProfile && !editMode && (
            <button onClick={openEdit}
              className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur text-white text-sm hover:bg-black/60 transition-colors" data-testid="button-edit-profile">
              <Edit3 className="w-4 h-4" />Editar perfil
            </button>
          )}
        </div>

        <div className="px-6">
          <div className="flex items-end justify-between -mt-14 mb-4">
            <div className="relative">
              <img src={avatar} className="w-28 h-28 rounded-full border-4 border-background object-cover bg-muted" alt="" loading="lazy" decoding="async" />
              {displayProfile.isVerified && (
                <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
              {isOwnProfile && (
                <>
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} />
                  <button onClick={() => avatarRef.current?.click()} disabled={avatarUploading}
                    className="absolute bottom-1 left-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center border-2 border-background hover:bg-black/80 transition-colors"
                    title="Subir foto">
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileTab("avatars");
                      const url = new URL(window.location.href);
                      url.searchParams.set("tab", "avatars");
                      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
                    }}
                    className="absolute bottom-1 right-8 w-7 h-7 rounded-full bg-primary/90 text-white flex items-center justify-center border-2 border-background hover:bg-primary transition-colors"
                    title="Crear avatar"
                    data-testid="button-profile-avatar-studio"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
            {!isOwnProfile && (
              <div className="flex gap-2 mb-2">
                <Button onClick={handleFollow} disabled={followUser.isPending || unfollowUser.isPending} variant={displayProfile.isFollowing ? "outline" : "default"} data-testid="button-follow-profile">
                  {displayProfile.isFollowing ? "Siguiendo" : "Seguir"}
                </Button>
                <Button variant="outline" data-testid="button-message-profile">Mensaje</Button>
              </div>
            )}
          </div>

          {editMode ? (
            <div className="glass-panel rounded-2xl p-6 mb-6 space-y-4">
              <h2 className="font-semibold text-lg">Editar perfil</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs text-muted-foreground mb-1 block">Bio</label><Input value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Tell people about yourself..." className="bg-white/5" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Location</label><Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="City, Country" className="bg-white/5" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Website</label><Input value={editWebsite} onChange={(e) => setEditWebsite(e.target.value)} placeholder="https://..." className="bg-white/5" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Phone</label><Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+1 234 567 890" className="bg-white/5" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Fecha de nacimiento</label><Input type="date" value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} className="bg-white/5" /></div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Visibilidad cumpleaños</label>
                  <FormSelect
                    value={editBirthVisibility}
                    onValueChange={setEditBirthVisibility}
                    options={[
                      { value: "amigos", label: "Solo amigos" },
                      { value: "publico", label: "Público" },
                      { value: "solo_yo", label: "Solo yo" },
                    ]}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Género</label>
                  <FormSelect
                    value={editGender}
                    onValueChange={setEditGender}
                    placeholder="Seleccionar"
                    options={[
                      { value: "male", label: "Masculino" },
                      { value: "female", label: "Femenino" },
                      { value: "non_binary", label: "No binario" },
                      { value: "other", label: "Otro" },
                      { value: "prefer_not_to_say", label: "Prefiero no decirlo" },
                    ]}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Estado sentimental</label>
                  <FormSelect
                    value={editRelationshipStatus}
                    onValueChange={setEditRelationshipStatus}
                    placeholder="Seleccionar"
                    options={Object.entries(RELATIONSHIP_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tipo de cuenta</label>
                  <FormSelect
                    value={editRole}
                    onValueChange={setEditRole}
                    options={Object.entries(ROLE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                  />
                </div>
              </div>

              {/* Skills */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1"><Award className="w-3.5 h-3.5" />Skills</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {editSkills.map((s, i) => (
                    <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-border text-sm">
                      <span>{s.skill}</span>
                      <span className="text-xs text-muted-foreground">({s.level})</span>
                      <button onClick={() => setEditSkills(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <button onClick={() => {
                    const skill = prompt("Skill name:");
                    if (skill) setEditSkills(prev => [...prev, { skill, level: "beginner" }]);
                  }} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors"><Plus className="w-3.5 h-3.5" />Add</button>
                </div>
              </div>

              {/* Experience */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />Experience</label>
                <div className="space-y-2">
                  {editExperience.map((exp, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-border text-sm">
                      <span className="font-medium">{exp.title}</span>
                      <span className="text-muted-foreground">at {exp.company}</span>
                      <button onClick={() => setEditExperience(prev => prev.filter((_, idx) => idx !== i))} className="ml-auto text-red-400 hover:text-red-300"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <button onClick={() => {
                    const company = prompt("Company:"); const title = prompt("Title:");
                    if (company && title) setEditExperience(prev => [...prev, { company, title, description: "", startDate: "", endDate: "", current: false }]);
                  }} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors"><Plus className="w-3.5 h-3.5" />Add</button>
                </div>
              </div>

              {/* Education */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" />Education</label>
                <div className="space-y-2">
                  {editEducation.map((edu, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-border text-sm">
                      <span className="font-medium">{edu.degree}</span>
                      <span className="text-muted-foreground">at {edu.institution}</span>
                      <button onClick={() => setEditEducation(prev => prev.filter((_, idx) => idx !== i))} className="ml-auto text-red-400 hover:text-red-300"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <button onClick={() => {
                    const institution = prompt("Institution:"); const degree = prompt("Degree:");
                    if (institution && degree) setEditEducation(prev => [...prev, { institution, degree, field: "", startYear: "", endYear: "", current: false }]);
                  }} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors"><Plus className="w-3.5 h-3.5" />Add</button>
                </div>
              </div>

              {/* Languages */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1"><Languages className="w-3.5 h-3.5" />Languages</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {editLanguages.map((l, i) => (
                    <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-border text-sm">
                      <span>{l.language}</span>
                      <span className="text-xs text-muted-foreground">({l.proficiency})</span>
                      <button onClick={() => setEditLanguages(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <button onClick={() => {
                    const language = prompt("Language:");
                    if (language) setEditLanguages(prev => [...prev, { language, proficiency: "conversational" }]);
                  }} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors"><Plus className="w-3.5 h-3.5" />Add</button>
                </div>
              </div>

              {/* Social Links */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1"><Globe className="w-3.5 h-3.5" />Social Links</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {editSocialLinks.map((l, i) => (
                    <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-border text-sm">
                      <span className="capitalize">{l.platform}</span>
                      <button onClick={() => setEditSocialLinks(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <button onClick={() => {
                    const platform = prompt("Platform (e.g. twitter, github, linkedin):");
                    const url = prompt("URL:");
                    if (platform && url) setEditSocialLinks(prev => [...prev, { platform, url }]);
                  }} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors"><Plus className="w-3.5 h-3.5" />Add</button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveEdit} disabled={updateMe.isPending} data-testid="button-save-profile">Guardar</Button>
                <Button variant="outline" onClick={() => setEditMode(false)} data-testid="button-cancel-edit">Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-2xl font-bold">{displayProfile.displayName}</h1>
                {displayProfile.isPremium && <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs"><Star className="w-3 h-3 mr-1" />Premium</Badge>}
                <Badge className={`${ROLE_COLORS[displayProfile.role ?? "user"]} text-white text-xs capitalize`}>{ROLE_LABELS[displayProfile.role ?? "user"]}</Badge>
                {displayProfile.isVerified && <CheckCircle className="w-5 h-5 text-primary" />}
              </div>
              <div className="text-muted-foreground mb-3">@{displayProfile.username}</div>
              {displayProfile.bio && <p className="text-sm mb-3 leading-relaxed">{displayProfile.bio}</p>}

              {/* Info grid */}
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
                {displayProfile.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{displayProfile.location}</span>}
                {displayProfile.website && <a href={displayProfile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline"><LinkIcon className="w-4 h-4" />{displayProfile.website.replace(/^https?:\/\//, "")}</a>}
                {displayProfile.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" />{displayProfile.phone}</span>}
                {displayProfile.birthDate && <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{displayProfile.birthDate}</span>}
                {displayProfile.gender && <span className="flex items-center gap-1.5 capitalize">{displayProfile.gender.replace("_", " ")}</span>}
                {displayProfile.relationshipStatus && (
                  <span className="flex items-center gap-1.5">
                    <Heart className="w-4 h-4" />
                    {RELATIONSHIP_LABELS[displayProfile.relationshipStatus] ?? displayProfile.relationshipStatus}
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-6 mb-4">
                <div className="text-center"><div className="font-bold text-lg">{displayProfile.postsCount}</div><div className="text-xs text-muted-foreground">Publicaciones</div></div>
                <div className="text-center"><div className="font-bold text-lg">{(displayProfile.followersCount ?? 0).toLocaleString()}</div><div className="text-xs text-muted-foreground">Seguidores</div></div>
                <div className="text-center"><div className="font-bold text-lg">{(displayProfile.followingCount ?? 0).toLocaleString()}</div><div className="text-xs text-muted-foreground">Siguiendo</div></div>
              </div>

              {/* Skills */}
              {displayProfile.skills && displayProfile.skills.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1"><Award className="w-3.5 h-3.5" />Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {displayProfile.skills.map((s: any) => (
                      <span key={s.id} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{s.skill} • {s.level}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {displayProfile.experience && displayProfile.experience.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />Experience</h3>
                  <div className="space-y-2">
                    {displayProfile.experience.map((exp: any) => (
                      <div key={exp.id} className="flex items-start gap-2 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-none"><Briefcase className="w-4 h-4 text-muted-foreground" /></div>
                        <div>
                          <div className="font-medium">{exp.title}</div>
                          <div className="text-muted-foreground text-xs">{exp.company}{exp.current ? " • Current" : ""}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {displayProfile.education && displayProfile.education.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" />Education</h3>
                  <div className="space-y-2">
                    {displayProfile.education.map((edu: any) => (
                      <div key={edu.id} className="flex items-start gap-2 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-none"><BookOpen className="w-4 h-4 text-muted-foreground" /></div>
                        <div>
                          <div className="font-medium">{edu.degree}</div>
                          <div className="text-muted-foreground text-xs">{edu.institution}{edu.current ? " • Current" : ""}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {displayProfile.languages && displayProfile.languages.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1"><Languages className="w-3.5 h-3.5" />Languages</h3>
                  <div className="flex flex-wrap gap-2">
                    {displayProfile.languages.map((l: any) => (
                      <span key={l.id} className="px-3 py-1 rounded-full bg-white/5 border border-border text-xs">{l.language} • {l.proficiency}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Links */}
              {displayProfile.socialLinks && displayProfile.socialLinks.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1"><Globe className="w-3.5 h-3.5" />Links</h3>
                  <div className="flex flex-wrap gap-2">
                    {displayProfile.socialLinks.map((l: any) => (
                      <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-white/5 border border-border text-xs hover:bg-white/10 transition-colors flex items-center gap-1.5 capitalize">
                        <Globe className="w-3 h-3" />{l.platform}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Posts tab */}
          <Tabs
            value={profileTab}
            onValueChange={(tab) => {
              setProfileTab(tab);
              const url = new URL(window.location.href);
              if (tab === "posts") url.searchParams.delete("tab");
              else url.searchParams.set("tab", tab);
              window.history.replaceState({}, "", `${url.pathname}${url.search}`);
            }}
            className="w-full"
          >
            <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none h-auto p-0 mb-6 overflow-x-auto flex-nowrap">
              <TabsTrigger value="posts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-3 sm:px-4 py-3 text-sm shrink-0"><Grid className="w-4 h-4 mr-1.5" />Publicaciones</TabsTrigger>
              {isOwnProfile && (
                <>
                  <TabsTrigger value="avatars" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-3 sm:px-4 py-3 text-sm shrink-0"><Sparkles className="w-4 h-4 mr-1.5" />Avatares</TabsTrigger>
                  <TabsTrigger value="photos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-3 sm:px-4 py-3 text-sm shrink-0"><Image className="w-4 h-4 mr-1.5" />Fotos</TabsTrigger>
                  <TabsTrigger value="saved" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-3 sm:px-4 py-3 text-sm shrink-0"><Bookmark className="w-4 h-4 mr-1.5" />Guardados</TabsTrigger>
                  <TabsTrigger value="stats" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-3 sm:px-4 py-3 text-sm shrink-0"><BarChart3 className="w-4 h-4 mr-1.5" />Estadísticas</TabsTrigger>
                </>
              )}
            </TabsList>
            <TabsContent value="posts" className="space-y-4">
              {isOwnProfile && (
                <div className="glass-panel rounded-2xl p-4 space-y-3" data-testid="profile-wall-composer">
                  <p className="text-sm font-medium neon-text">¿Qué estás pensando?</p>
                  <textarea
                    value={wallText}
                    onChange={(e) => setWallText(e.target.value)}
                    placeholder="Escribe algo en tu muro..."
                    rows={3}
                    className="w-full rounded-xl bg-white/5 border border-input px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button
                    className="rounded-xl"
                    disabled={!wallText.trim() || createPost.isPending}
                    onClick={handlePublishWall}
                    data-testid="button-profile-post"
                  >
                    {createPost.isPending ? "Publicando..." : "Publicar en mi muro"}
                  </Button>
                </div>
              )}
              {postsLoading ? (
                <div className="h-32 glass-panel rounded-2xl animate-pulse" />
              ) : (userPosts ?? []).length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="font-medium">Aún no hay publicaciones</p>
                  <p className="text-sm">{isOwnProfile ? "¡Comparte algo con tus seguidores!" : "Este usuario aún no ha publicado."}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(userPosts ?? []).map((post) => (
                    <div key={post.id} className="glass-panel rounded-2xl p-4" data-testid={`post-${post.id}`}>
                      <p className="text-sm mb-3 line-clamp-3">{post.content}</p>
                      {post.mediaUrls?.[0] && <img src={post.mediaUrls[0]} className="rounded-xl w-full object-cover max-h-60 mb-3" alt="" loading="lazy" decoding="async" />}
                      <div className="flex gap-4 text-muted-foreground text-sm">
                        <span className="flex items-center gap-1.5"><Heart className="w-4 h-4" />{post.likesCount}</span>
                        <span className="flex items-center gap-1.5"><MessageCircle className="w-4 h-4" />{post.commentsCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            {isOwnProfile && (
              <>
                <TabsContent value="avatars">
                  <ProfileAvatarsTab />
                </TabsContent>
                <TabsContent value="photos">
                  <ProfilePhotosTab />
                </TabsContent>
                <TabsContent value="saved">
                  <ProfileSavedTab />
                </TabsContent>
                <TabsContent value="stats">
                  <ProfileStatsTab />
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </div>
    </Shell>
  );
}
