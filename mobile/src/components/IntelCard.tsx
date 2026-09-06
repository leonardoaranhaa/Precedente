import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Globe, ExternalLink, Search, AlertTriangle } from "lucide-react-native";
import { fetchExternalIntel } from "../api";
import { colors, radius } from "../theme";
import { fonts } from "../fonts";
import type { ExternalIntelResult } from "../types";

export function IntelCard({ ticker }: { ticker: string }) {
  const [intel, setIntel] = useState<ExternalIntelResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchExternalIntel(ticker);
      setIntel(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao buscar contexto.");
    } finally {
      setLoading(false);
    }
  };

  if (!intel && !loading && !error) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Globe size={16} color={colors.accent} />
          <Text style={styles.title}>Inteligência de Mercado</Text>
        </View>
        <Text style={styles.desc}>
          Agente AI busca notícias, eventos e contexto de mercado em tempo real
          para {ticker}.
        </Text>
        <Pressable style={styles.button} onPress={load}>
          <Search size={14} color={colors.bg} />
          <Text style={styles.buttonText}>Buscar contexto</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Globe size={16} color={colors.accent} />
          <Text style={styles.title}>Inteligência de Mercado</Text>
        </View>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.loadingText}>
            Buscando notícias e contexto para {ticker}...
          </Text>
        </View>
        <Text style={styles.loadingHint}>
          O agente pesquisa fontes reais na web. Pode levar até 30s.
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <AlertTriangle size={16} color={colors.warn} />
          <Text style={styles.title}>Inteligência de Mercado</Text>
        </View>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={load}>
          <Text style={styles.retryText}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  if (!intel) return null;

  const ago = Math.round((Date.now() - intel.fetchedAt) / 60000);
  const agoLabel = ago < 1 ? "agora" : `${ago}min atrás`;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Globe size={16} color={colors.accent} />
        <Text style={styles.title}>
          Inteligência · {intel.displayTicker}
        </Text>
        <Text style={styles.meta}>{agoLabel}</Text>
      </View>

      <Text style={styles.summary}>{intel.summary}</Text>

      {intel.sources.length > 0 && (
        <View style={styles.sources}>
          <Text style={styles.sourcesLabel}>Fontes</Text>
          {intel.sources.map((src) => (
            <Pressable
              key={src.url}
              style={styles.sourceRow}
              onPress={() => Linking.openURL(src.url)}
            >
              <ExternalLink size={12} color={colors.subtle} />
              <Text style={styles.sourceText} numberOfLines={1}>
                {src.title}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.disclaimer}>
        Contexto informativo gerado por AI com busca web real
        ({intel.searchCount} {intel.searchCount === 1 ? "busca" : "buscas"}).
        Não é recomendação de investimento.
      </Text>

      <Pressable style={styles.refreshButton} onPress={load}>
        <Search size={12} color={colors.accent} />
        <Text style={styles.refreshText}>Atualizar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    color: colors.fg,
    flex: 1,
  },
  meta: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.subtle,
  },
  desc: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 19,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  buttonText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    color: colors.bg,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
    flex: 1,
  },
  loadingHint: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.subtle,
    fontStyle: "italic",
  },
  errorText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.warn,
    lineHeight: 19,
  },
  retryButton: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warn,
  },
  retryText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.warn,
  },
  summary: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.fg,
    lineHeight: 21,
  },
  sources: {
    gap: 4,
  },
  sourcesLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.subtle,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 3,
  },
  sourceText: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.accent,
    flex: 1,
  },
  disclaimer: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.subtle,
    fontStyle: "italic",
    lineHeight: 16,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  refreshText: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.accent,
  },
});
