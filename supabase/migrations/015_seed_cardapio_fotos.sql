-- Migration 015: fotos iniciais do carrossel do cardápio
-- Execute no SQL Editor do Supabase DEPOIS da 014.
--
-- São as 12 fotos do modelo aprovado. Os arquivos ficam no próprio app
-- (public/cardapio/fotos), não no bucket; as fotos novas enviadas por
-- Configurações > Cardápio Online vão para o bucket normalmente. Pode rodar
-- mais de uma vez: foto já cadastrada não é duplicada.

insert into cardapio_fotos (url, storage_path, legenda, ordem)
select v.url, v.storage_path, v.legenda, v.ordem
from (values
  ('/cardapio/fotos/bolo-perolas.webp', 'public/cardapio/fotos/bolo-perolas.webp', 'Bolo branco com detalhes em rosa e pérolas, assinatura Sandra Zampoli', 1),
  ('/cardapio/fotos/bolo-casamento.webp', 'public/cardapio/fotos/bolo-casamento.webp', 'Bolo de casamento de três andares, branco com flores', 2),
  ('/cardapio/fotos/bolo-coracoes.webp', 'public/cardapio/fotos/bolo-coracoes.webp', 'Bolo branco com corações vermelhos e laço de fita', 3),
  ('/cardapio/fotos/bolo-limao.webp', 'public/cardapio/fotos/bolo-limao.webp', 'Bolo branco decorado com flores e fatias de limão', 4),
  ('/cardapio/fotos/bolo-cereja.webp', 'public/cardapio/fotos/bolo-cereja.webp', 'Bolo branco com laços xadrez vermelhos e cerejas', 5),
  ('/cardapio/fotos/bolo-circo.webp', 'public/cardapio/fotos/bolo-circo.webp', 'Bolo infantil de dois andares, tema circo', 6),
  ('/cardapio/fotos/bolo-chocolate.webp', 'public/cardapio/fotos/bolo-chocolate.webp', 'Bolo com cobertura de chocolate, morangos e trufas', 7),
  ('/cardapio/fotos/bolo-celestial.webp', 'public/cardapio/fotos/bolo-celestial.webp', 'Bolo azul tema celestial com sol, lua e estrelas douradas', 8),
  ('/cardapio/fotos/bolo-lavanda.webp', 'public/cardapio/fotos/bolo-lavanda.webp', 'Bolo branco com pétalas lilás e mensagem Happy Birthday', 9),
  ('/cardapio/fotos/bolo-rosa.webp', 'public/cardapio/fotos/bolo-rosa.webp', 'Bolo branco e rosa com Happy Birthday dourado', 10),
  ('/cardapio/fotos/bolo-borboletas.webp', 'public/cardapio/fotos/bolo-borboletas.webp', 'Bolo dourado com borboletas e livro de açúcar', 11),
  ('/cardapio/fotos/bolo-harrypotter.webp', 'public/cardapio/fotos/bolo-harrypotter.webp', 'Bolo tema Harry Potter com nome Karol', 12)
) as v(url, storage_path, legenda, ordem)
where not exists (select 1 from cardapio_fotos f where f.url = v.url);
