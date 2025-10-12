import { api } from "../api";

export const viewRanking = async(leagueId) => {
    const res = await api.get(`/ranking/${leagueId}`);
    return res.data;
}