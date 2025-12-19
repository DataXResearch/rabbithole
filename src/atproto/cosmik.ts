import { createRecord } from "./client";

export interface CosmikRef {
  uri: string;
  cid: string;
}

export async function createCollection(did: string, name: string): Promise<CosmikRef> {
  const collectionRecord = {
    name: name,
    accessType: "CLOSED",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    $type: "network.cosmik.collection",
  };

  return await createRecord(
    did,
    "network.cosmik.collection",
    collectionRecord
  );
}

export async function createUrlCard(did: string, site: any): Promise<CosmikRef> {
  const metadata = {
    type: "link",
    $type: "network.cosmik.card#urlMetadata",
    title: site.name,
    description: site.description || undefined,
    imageUrl:
      site.openGraphImageUrl &&
      site.openGraphImageUrl.startsWith("http")
        ? site.openGraphImageUrl
        : undefined,
    retrievedAt: new Date(site.savedAt).toISOString(),
  };

  const cardRecord = {
    type: "URL",
    $type: "network.cosmik.card",
    url: site.url,
    content: {
      $type: "network.cosmik.card#urlContent",
      url: site.url,
      metadata: metadata,
    },
    createdAt: new Date(site.savedAt).toISOString(),
  };

  return await createRecord(
    did,
    "network.cosmik.card",
    cardRecord
  );
}

export async function createCollectionLink(
  did: string,
  collection: CosmikRef,
  card: CosmikRef
): Promise<CosmikRef> {
  const linkRecord = {
    $type: "network.cosmik.collectionLink",
    collection: {
      uri: collection.uri,
      cid: collection.cid,
    },
    card: {
      uri: card.uri,
      cid: card.cid,
    },
    addedBy: did,
    addedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  return await createRecord(
    did,
    "network.cosmik.collectionLink",
    linkRecord
  );
}
