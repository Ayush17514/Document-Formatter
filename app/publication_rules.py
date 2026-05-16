"""
Publication + manuscript formatting rules registry.

Maps:

Document Type
    ↓
Publication
    ↓
Strict formatting config

Used by:
- ai_template_resolver.py
- formatter.py
- template_engine.py
"""

PUBLICATION_RULES = {

    "Book Chapter": {

        "Springer Book Chapters": {

            "publisher":"Springer",

            "page_size":"a4",

            "margins":{
                "top":1.0,
                "bottom":1.0,
                "left":1.0,
                "right":1.0
            },

            "columns":1,

            "font_family":"Times New Roman",

            "font_size_body":12,

            "font_size_headings":14,

            "line_spacing":1.5,

            "citation_style":"Springer",

            "heading_numbering":True,

            "abstract_required":True,

            "keywords_required":True,

            "abstract_words_min":150,
            "abstract_words_max":250,

            "keywords_min":5,
            "keywords_max":8,

            "required_sections":[
                "Introduction",
                "Literature Review",
                "Methodology",
                "Results",
                "Discussion",
                "Conclusion"
            ]
        },


        "Elsevier Book Chapters":{

            "publisher":"Elsevier",

            "page_size":"a4",

            "margins":{
                "top":1,
                "bottom":1,
                "left":1,
                "right":1
            },

            "columns":1,

            "font_family":"Times New Roman",

            "font_size_body":11,

            "font_size_headings":14,

            "line_spacing":1.5,

            "citation_style":"APA",

            "heading_numbering":True
        },


        "CRC Press edited volumes":{

            "publisher":"CRC Press",

            "page_size":"a4",

            "margins":{
                "top":1,
                "bottom":1,
                "left":1,
                "right":1
            },

            "columns":1,

            "font_family":"Times New Roman",

            "font_size_body":12,

            "font_size_headings":14,

            "line_spacing":1.5,

            "citation_style":"APA"
        },


        "IGI Global book chapters":{

            "publisher":"IGI Global",

            "page_size":"a4",

            "margins":{
                "top":1,
                "bottom":1,
                "left":1,
                "right":1
            },

            "columns":1,

            "font_family":"Times New Roman",

            "font_size_body":11,

            "font_size_headings":13,

            "line_spacing":1.15,

            "citation_style":"APA"
        },


        "Wiley edited books":{

            "publisher":"Wiley",

            "page_size":"a4",

            "margins":{
                "top":1,
                "bottom":1,
                "left":1,
                "right":1
            },

            "columns":1,

            "font_family":"Times New Roman",

            "font_size_body":12,

            "font_size_headings":14,

            "line_spacing":1.5,

            "citation_style":"APA"
        },


        "Taylor & Francis edited books":{

            "publisher":"Taylor & Francis",

            "page_size":"a4",

            "margins":{
                "top":1,
                "bottom":1,
                "left":1,
                "right":1
            },

            "columns":1,

            "font_family":"Times New Roman",

            "font_size_body":12,

            "font_size_headings":14,

            "line_spacing":1.5,

            "citation_style":"APA"
        }

    },



    "Research Paper":{

        "IEEE Access":{

            "publisher":"IEEE",

            "page_size":"letter",

            "margins":{
                "top":0.75,
                "bottom":1,
                "left":0.625,
                "right":0.625
            },

            "columns":2,

            "font_family":"Times New Roman",

            "font_size_body":10,

            "font_size_headings":24,

            "line_spacing":1.0,

            "citation_style":"IEEE",

            "heading_numbering":True
        },


        "ACM Journals":{

            "publisher":"ACM",

            "page_size":"letter",

            "margins":{
                "top":1,
                "bottom":1,
                "left":0.75,
                "right":0.75
            },

            "columns":2,

            "font_family":"Libertine",

            "font_size_body":9,

            "font_size_headings":14,

            "line_spacing":1,

            "citation_style":"ACM"
        },


        "Springer Journals":{

            "publisher":"Springer",

            "page_size":"a4",

            "margins":{
                "top":1,
                "bottom":1,
                "left":1,
                "right":1
            },

            "columns":1,

            "font_family":"Times New Roman",

            "font_size_body":12,

            "font_size_headings":14,

            "line_spacing":1.5,

            "citation_style":"Springer"
        },


        "Elsevier Journals":{

            "publisher":"Elsevier",

            "page_size":"a4",

            "margins":{
                "top":1,
                "bottom":1,
                "left":1,
                "right":1
            },

            "columns":1,

            "font_family":"Times New Roman",

            "font_size_body":11,

            "font_size_headings":13,

            "line_spacing":1.5,

            "citation_style":"APA"
        },


        "Nature":{

            "publisher":"Nature",

            "page_size":"a4",

            "margins":{
                "top":1,
                "bottom":1,
                "left":1,
                "right":1
            },

            "columns":1,

            "font_family":"Arial",

            "font_size_body":10,

            "font_size_headings":13,

            "line_spacing":1.15,

            "citation_style":"Nature"
        },


        "MDPI":{

            "publisher":"MDPI",

            "page_size":"a4",

            "margins":{
                "top":1,
                "bottom":1,
                "left":1,
                "right":1
            },

            "columns":1,

            "font_family":"Times New Roman",

            "font_size_body":10,

            "font_size_headings":12,

            "line_spacing":1.15,

            "citation_style":"MDPI"
        }

    },



    "Conference Paper":{

        "IEEE Conference":{

            "publisher":"IEEE",

            "page_size":"letter",

            "margins":{
                "top":0.75,
                "bottom":1,
                "left":0.625,
                "right":0.625
            },

            "columns":2,

            "font_family":"Times New Roman",

            "font_size_body":10,

            "font_size_headings":24,

            "line_spacing":1,

            "citation_style":"IEEE",

            "heading_numbering":True
        },


        "ACM Conference":{

            "publisher":"ACM",

            "page_size":"letter",

            "margins":{
                "top":1,
                "bottom":1,
                "left":0.75,
                "right":0.75
            },

            "columns":2,

            "font_family":"Libertine",

            "font_size_body":9,

            "font_size_headings":14,

            "line_spacing":1,

            "citation_style":"ACM"
        },


        "Springer LNCS":{

            "publisher":"Springer",

            "page_size":"a4",

            "margins":{
                "top":1,
                "bottom":1,
                "left":1,
                "right":1
            },

            "columns":1,

            "font_family":"Times New Roman",

            "font_size_body":10,

            "font_size_headings":14,

            "line_spacing":1.15,

            "citation_style":"LNCS"
        },


        "Elsevier Proceedings":{

            "publisher":"Elsevier",

            "page_size":"a4",

            "margins":{
                "top":1,
                "bottom":1,
                "left":1,
                "right":1
            },

            "columns":1,

            "font_family":"Times New Roman",

            "font_size_body":11,

            "font_size_headings":12,

            "line_spacing":1.15,

            "citation_style":"APA"
        }

    },



    "Review Paper":{

        "PLOS":{

            "publisher":"PLOS",

            "page_size":"a4",

            "margins":{
                "top":1,
                "bottom":1,
                "left":1,
                "right":1
            },

            "columns":1,

            "font_family":"Arial",

            "font_size_body":11,

            "font_size_headings":13,

            "line_spacing":1.5,

            "citation_style":"PLOS"
        },


        "Scientific Reports":{

            "publisher":"Nature",

            "page_size":"a4",

            "margins":{
                "top":1,
                "bottom":1,
                "left":1,
                "right":1
            },

            "columns":1,

            "font_family":"Arial",

            "font_size_body":11,

            "font_size_headings":13,

            "line_spacing":1.5,

            "citation_style":"Nature"
        },


        "Wiley Reviews":{

            "publisher":"Wiley",

            "page_size":"a4",

            "margins":{
                "top":1,
                "bottom":1,
                "left":1,
                "right":1
            },

            "columns":1,

            "font_family":"Times New Roman",

            "font_size_body":12,

            "font_size_headings":14,

            "line_spacing":1.5,

            "citation_style":"APA"
        }

    }

}



DEFAULT_RULES={

    "margins":{
        "top":1,
        "bottom":1,
        "left":1,
        "right":1
    },

    "columns":1,

    "font_family":"Times New Roman",

    "font_size_body":12,

    "font_size_headings":14,

    "line_spacing":1.15,

    "citation_style":"APA",

    "heading_numbering":False,

    "abstract_required":True,

    "keywords_required":True,

    "required_sections":[]
}


for manuscript_type in PUBLICATION_RULES:

    for publication in PUBLICATION_RULES[manuscript_type]:

        config=PUBLICATION_RULES[
            manuscript_type
        ][publication]

        for key,value in DEFAULT_RULES.items():

            if key not in config:

                config[key]=value