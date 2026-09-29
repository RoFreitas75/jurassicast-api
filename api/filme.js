export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const titulo = req.query.titulo;
  const token = process.env.TMDB_TOKEN;

  if (!titulo) {
    return res.status(400).json({
      erro: "Informe o título do filme. Exemplo: /api/filme?titulo=tubarao"
    });
  }

  if (!token) {
    return res.status(500).json({
      erro: "TMDB_TOKEN não configurado no servidor."
    });
  }

  try {
    const headers = {
      Authorization: `Bearer ${token}`,
      accept: "application/json"
    };

    const buscaUrl =
      "https://api.themoviedb.org/3/search/movie?query=" +
      encodeURIComponent(titulo) +
      "&language=pt-BR&include_adult=false";

    const buscaResp = await fetch(buscaUrl, { headers });

    if (!buscaResp.ok) {
      throw new Error(`TMDB retornou HTTP ${buscaResp.status}`);
    }

    const busca = await buscaResp.json();

    if (!busca.results || busca.results.length === 0) {
      return res.status(404).json({
        erro: "Filme não encontrado.",
        busca: titulo
      });
    }

    const filme = busca.results[0];

    const detalheUrl =
      `https://api.themoviedb.org/3/movie/${filme.id}` +
      "?language=pt-BR&append_to_response=credits";

    const detalheResp = await fetch(detalheUrl, { headers });

    if (!detalheResp.ok) {
      throw new Error(`TMDB retornou HTTP ${detalheResp.status}`);
    }

    const dados = await detalheResp.json();

    const diretor =
      dados.credits?.crew?.find(p => p.job === "Director")?.name || null;

    const elenco = (dados.credits?.cast || [])
      .slice(0, 8)
      .map(p => p.name);

    return res.status(200).json({
      id_tmdb: dados.id,
      titulo: dados.title,
      titulo_original: dados.original_title,
      ano: dados.release_date ? dados.release_date.slice(0, 4) : null,
      data_lancamento: dados.release_date || null,
      sinopse: dados.overview || null,
      nota_tmdb: dados.vote_average ?? null,
      votos_tmdb: dados.vote_count ?? null,
      diretor,
      elenco,
      generos: (dados.genres || []).map(g => g.name),
      poster: dados.poster_path
        ? `https://image.tmdb.org/t/p/w500${dados.poster_path}`
        : null,
      backdrop: dados.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${dados.backdrop_path}`
        : null,
      tmdb_url: `https://www.themoviedb.org/movie/${dados.id}`
    });
  } catch (erro) {
    return res.status(500).json({
      erro: "Não foi possível consultar o TMDB.",
      detalhe: erro.message
    });
  }
}
