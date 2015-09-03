<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:xs="http://www.w3.org/2001/XMLSchema"
  exclude-result-prefixes="xs"
  version="1.0">
  
  <xsl:import href="lib/xml2json.xsl"/>
  <xsl:output method="text"/>
  
  <xsl:param name="dtd-annotation"><foo/></xsl:param>
  <xsl:param name='root'>article</xsl:param>
  
  <xsl:template name='root'>
    <o>
      <s k='root'><xsl:value-of select='$root'/></s>
      <o k='elements'>
        <xsl:for-each select='/declarations/elements/element'>
          <xsl:if test='not(starts-with(@name, "mml:"))'>
            <o k='{@name}'>
              <xsl:apply-templates select='content-model[@spec="element"]'/>
            </o>
          </xsl:if>
        </xsl:for-each>
      </o>
    </o>
  </xsl:template>
  
  <xsl:template match='content-model[@spec="element"]'>
    <a k='content-model'>
      <xsl:apply-templates/>
    </a>
  </xsl:template>
  
  <xsl:template match='seq|choice'>
    <o>
      <s k="type"><xsl:value-of select='local-name(.)'/></s>
      <xsl:if test='@q'>
        <s k='q'><xsl:value-of select="@q"/></s>
      </xsl:if>
      <a k='children'>
        <xsl:apply-templates/>
      </a>
    </o>
  </xsl:template>
  
  <xsl:template match='child'>
    <o>
      <s k='name'><xsl:value-of select="."/></s>
      <s k='q'><xsl:value-of select="@q"/></s>
    </o>
  </xsl:template>
</xsl:stylesheet>
