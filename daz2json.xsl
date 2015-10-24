<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:xs="http://www.w3.org/2001/XMLSchema"
  exclude-result-prefixes="xs"
  version="2.0">
  
  <xsl:import href="lib/xml2json-2.0.xsl"/>
  <xsl:output method="text"/>
  
  <xsl:param name="dtd-annotation"><foo/></xsl:param>
  <xsl:param name='root'>article</xsl:param>
  
  <xsl:template name='root'>
    <o>
      <s k='root'>
        <xsl:value-of select='/declarations/elements/element[@root="true"][1]/@name'/>
      </s>
      <o k='elements'>
        <xsl:for-each select='/declarations/elements/element'>
          <xsl:variable name='name' select='@name'/>
          <o k='{$name}'>
            <xsl:apply-templates select='content-model'/>
            <xsl:if test='/declarations/attributes/attribute[attributeDeclaration/@element=$name]'>
              <a k='attributes'>
                <xsl:apply-templates
                  select='/declarations/attributes/attribute[attributeDeclaration/@element=$name]'/>
              </a>
            </xsl:if>
          </o>
        </xsl:for-each>
      </o>
    </o>
  </xsl:template>
  
  <xsl:template match='content-model'>
    <o k='content-model'>
      <s k='spec'>
        <xsl:value-of select='@spec'/>
      </s>
      <xsl:if test='@spec != "empty"'>
        <a k='children'>
          <xsl:choose>
            <xsl:when test='@spec = "text"'>
              <o><s k='name'>#PCDATA</s></o>
            </xsl:when>
            <xsl:when test='@spec = "mixed"'>
              <o><s k='name'>#PCDATA</s></o>
              <xsl:apply-templates/>
            </xsl:when>
            <xsl:when test='@spec = "any"'>
              <o><s k='name'>ANY</s></o>
            </xsl:when>
            <xsl:when test='@spec = "element"'>
              <xsl:apply-templates/>
            </xsl:when>
          </xsl:choose>
        </a>
      </xsl:if>
    </o>
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
      <xsl:if test='@q'>
        <s k='q'><xsl:value-of select="@q"/></s>
      </xsl:if>
    </o>
  </xsl:template>

  <xsl:template match='attribute'>
    <o><s k='name'><xsl:value-of select='@name'/></s></o>
  </xsl:template>
</xsl:stylesheet>
