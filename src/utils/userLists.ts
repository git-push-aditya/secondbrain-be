import client from '../prismaClient';

export interface UserLists {
    tagsList: { title: string }[];
    collectionList: { id: number; name: string; shared: boolean }[];
    allCommunities: { id: number; name: string; isFounder: boolean }[];
}

/* The sidebar/modal payload. Shared by /me, signin and signup so the client gets it on the
   same round trip that authenticates it - it used to need a second request to
   /communitycollectionlist before it even knew which collectionId to fetch content for. */
export const getUserLists = async (userId: number): Promise<UserLists> => {

    const [collectionList, tagsList, communityRow] = await Promise.all([
        client.collection.findMany({
            where: { userId },
            select: { id: true, name: true, shared: true }
        }),

        /* scoped to tags this user actually uses - an unfiltered findMany here returned every
           tag row in the database, which grew without bound and exposed other users' tag names */
        client.tags.findMany({
            where: { content: { some: { content: { userId } } } },
            select: { title: true }
        }),

        client.user.findUnique({
            where: { id: userId },
            select: {
                founded: { select: { id: true, name: true } },
                memberOf: { select: { community: { select: { id: true, name: true } } } }
            }
        })
    ]);

    const founded = (communityRow?.founded ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        isFounder: true
    }));

    const memberOf = (communityRow?.memberOf ?? []).map((m) => ({
        id: m.community.id,
        name: m.community.name,
        isFounder: false
    }));

    return { tagsList, collectionList, allCommunities: [...founded, ...memberOf] };
};
