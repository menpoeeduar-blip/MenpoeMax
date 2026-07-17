export type AvatarStudioConfig = {
  skinColor: string;
  top: string;
  hairColor: string;
  hatColor: string;
  eyes: string;
  eyebrows: string;
  mouth: string;
  nose: string;
  clothing: string;
  clothesColor: string;
  clothesGraphic: string;
  accessories: string;
  accessoriesColor: string;
  facialHair: string;
  facialHairColor: string;
};

export type AvatarSticker = {
  id: string;
  label: string;
  expressionKey: string;
  imageUrl: string;
};

export type UserAvatarRecord = {
  id: string;
  userId: string;
  name: string;
  config: AvatarStudioConfig;
  previewUrl: string;
  stickers: AvatarSticker[];
  isPrimary?: boolean;
  createdAt: string;
  updatedAt: string;
};
