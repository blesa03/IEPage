import { api } from "../api";

export const viewRanking = async(leagueId) => {
    const res = await api.get(`/ranking/${leagueId}`);
    return res.data;
}

export const getTopScorers = async (leagueId) => {
  const res = await api.get(`/ranking/${leagueId}/scorers`);
  return res.data;
};

export const getTopGoalkeepers = async (leagueId) => {
  const res = await api.get(`/ranking/${leagueId}/goalkeepers`);
  return res.data;
};