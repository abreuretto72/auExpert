export type PetSex = 'male' | 'female' | 'unknown';

export interface PetSystemContextInput {
  name: string;
  sex: PetSex | string | null | undefined;
  species: string;
  locale: string;
}

export function buildPetSystemContext(pet: PetSystemContextInput): string {
  const sex: PetSex = (pet.sex === 'male' || pet.sex === 'female') ? pet.sex : 'unknown';
  const lang = pet.locale.slice(0, 2) as 'pt' | 'es' | 'en';

  if (lang === 'pt') {
    if (sex === 'male') {
      return `INFORMAÇÕES DO PET:
- Nome: ${pet.name}
- Espécie: ${pet.species}
- Sexo: macho

REGRAS DE LINGUAGEM OBRIGATÓRIAS:
1. ${pet.name} é MACHO.
2. Use artigo masculino: "o ${pet.name}", "do ${pet.name}", "ao ${pet.name}", "pelo ${pet.name}".
3. Flexione adjetivos no masculino: "cansado", "bonito", "vacinado".
4. Use pronome "ele", "dele".
5. NUNCA erre o gênero. Revise cada frase antes de gerar.`;
    }
    if (sex === 'female') {
      return `INFORMAÇÕES DO PET:
- Nome: ${pet.name}
- Espécie: ${pet.species}
- Sexo: fêmea

REGRAS DE LINGUAGEM OBRIGATÓRIAS:
1. ${pet.name} é FÊMEA.
2. Use artigo feminino: "a ${pet.name}", "da ${pet.name}", "à ${pet.name}", "pela ${pet.name}".
3. Flexione adjetivos no feminino: "cansada", "bonita", "vacinada".
4. Use pronome "ela", "dela".
5. NUNCA erre o gênero. Revise cada frase antes de gerar.`;
    }
    return `INFORMAÇÕES DO PET:
- Nome: ${pet.name}
- Espécie: ${pet.species}
- Sexo: não informado

Use formas neutras. Prefira o nome ${pet.name} diretamente sem artigo quando possível, ou "o pet".`;
  }

  if (lang === 'es') {
    if (sex === 'male') {
      return `INFORMACIÓN DE LA MASCOTA:
- Nombre: ${pet.name}
- Especie: ${pet.species}
- Sexo: macho

REGLAS DE LENGUAJE OBLIGATORIAS:
1. ${pet.name} es MACHO.
2. Usa artículo masculino: "el ${pet.name}", "del ${pet.name}", "al ${pet.name}".
3. Flexiona adjetivos en masculino: "cansado", "bonito", "vacunado".
4. Usa pronombre "él", "su".
5. NUNCA confundas el género.`;
    }
    if (sex === 'female') {
      return `INFORMACIÓN DE LA MASCOTA:
- Nombre: ${pet.name}
- Especie: ${pet.species}
- Sexo: hembra

REGLAS DE LENGUAJE OBLIGATORIAS:
1. ${pet.name} es HEMBRA.
2. Usa artículo femenino: "la ${pet.name}", "de la ${pet.name}", "a la ${pet.name}".
3. Flexiona adjetivos en femenino: "cansada", "bonita", "vacunada".
4. Usa pronombre "ella", "su".
5. NUNCA confundas el género.`;
    }
    return `INFORMACIÓN DE LA MASCOTA:
- Nombre: ${pet.name}
- Especie: ${pet.species}
- Sexo: no informado

Usa formas neutras: "la mascota", "su mascota".`;
  }

  // en-US default
  const pronoun = sex === 'male' ? 'he/him/his' : sex === 'female' ? 'she/her/her' : 'they/them/their';
  return `PET INFORMATION:
- Name: ${pet.name}
- Species: ${pet.species}
- Sex: ${sex === 'unknown' ? 'not specified' : sex}

Use ${pronoun} pronouns when referring to ${pet.name}.`;
}
