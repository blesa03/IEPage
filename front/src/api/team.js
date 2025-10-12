import { api } from "../api";

export const viewTeam = async(draftId) => {
    const res = await api.get(`/team/${draftId}`);
    return res.data;
}