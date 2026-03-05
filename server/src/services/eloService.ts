export const calculateElo = (
    ratingA: number,
    ratingB: number,
    scoreA: number,
    scoreB: number
) => {
    // Elo K-factor
    const K = 32;

    // Expected scores
    const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const expectedB = 1 / (1 + Math.pow(10, (ratingA - ratingB) / 400));

    // Actual scores based on match results
    let actualA = 0;
    let actualB = 0;

    if (scoreA > scoreB) {
        actualA = 1;
        actualB = 0;
    } else if (scoreB > scoreA) {
        actualA = 0;
        actualB = 1;
    } else {
        // Treat as draw or tie
        actualA = 0.5;
        actualB = 0.5;
    }

    // Calculate new ratings
    const newRatingA = Math.round(ratingA + K * (actualA - expectedA));
    const newRatingB = Math.round(ratingB + K * (actualB - expectedB));

    return { newRatingA, newRatingB };
};
